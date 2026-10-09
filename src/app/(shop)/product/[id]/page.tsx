import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { downloadableCoupons, presentProducts } from "@/lib/store-price";
import { discountPercentLabel } from "@/lib/exhibition-price";
import { formatPrice, parseGallery } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { claimCoupon } from "@/actions/commerce";
import { AddToCart } from "@/components/add-to-cart";
import { ProductImage } from "@/components/product-image";
import { DEFAULT_PRODUCT_IMAGE } from "@/lib/default-product-image";
import { SHIPPING_FEE, SHIPPING_NOTICE, shippingFee } from "@/lib/checkout-pricing";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { category: true },
  });
  if (!product || !product.isPublished) notFound();
  if (id !== product.id) redirect(`/product/${product.id}`);
  const session = await requireUser();
  const [[sale], coupons] = await Promise.all([
    presentProducts([product], new Date(), session?.user.id),
    downloadableCoupons(product, session?.user.id),
  ]);
  if (!sale) notFound();
  const visibleCoupons = [...coupons].sort((left, right) => right.rate - left.rate).filter((coupon) => coupon.rate > 0).slice(0, 2);
  const listPrice = sale.originalPrice ?? product.originalPrice ?? sale.price;
  const salePrice = sale.price;
  const couponPrice = sale.couponPrice;
  const appliedCoupon = sale.appliedCoupon;
  const delivery = shippingFee(couponPrice);
  const payable = couponPrice + delivery;
  const rateLabel = listPrice > salePrice ? discountPercentLabel(listPrice, salePrice) : null;

  const gallery = [product.imageUrl, ...parseGallery(product.gallery)].filter(Boolean);
  const sources = gallery.length ? gallery : [DEFAULT_PRODUCT_IMAGE];

  return (
    <div className="grid gap-12 md:grid-cols-2">
      <div className="space-y-3">
        {sources.map((src) => (
          <div key={src} className="relative aspect-[4/5] overflow-hidden bg-surface">
            <ProductImage src={src} alt={product.name} fill />
          </div>
        ))}
      </div>
      <div className="md:sticky md:top-28 md:self-start" data-testid="상품상세" data-product-id={product.id} data-purchasable={product.stock > 0 ? "true" : "false"}>
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted" data-testid="상품카테고리">
          {product.category.name}
        </p>
        <p className="mt-3 text-[0.72rem] tracking-wide text-muted" data-testid="상품번호">{product.id}</p>
        <h1 className="product-name mt-1 text-5xl leading-snug" data-testid="상품명">{product.name}</h1>
        <p className="mt-6 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-sm" data-testid="가격줄">
          {listPrice > salePrice ? <s className="basis-full text-right text-xs line-through" data-testid="정가" data-price={listPrice} style={{ fontWeight: 400, color: "#c5c0b8" }}>{formatPrice(listPrice)}</s> : null}
          <b className="font-normal">{session ? "할인가" : "판매가"}</b>
          <span data-testid="할인율" className={rateLabel ? "ml-auto mr-2" : "ml-auto"} style={rateLabel ? { color: "#e10600", fontWeight: 400 } : undefined}>{rateLabel ?? ""}</span>
          <span className="font-bold" data-testid="판매가" data-price={salePrice}>{formatPrice(salePrice)}</span>
        </p>
        <div className="mt-4 space-y-4 border-b border-line pb-5 text-sm">
          {session ? <div>
            <div className="flex items-center justify-between gap-4">
              <span>쿠폰 할인가</span>
              <span className="font-bold" data-testid="쿠폰할인가" data-price={couponPrice}>{formatPrice(couponPrice)}</span>
            </div>
            {appliedCoupon ? (
              <div className="mt-2 flex items-start justify-between gap-4 text-xs" data-testid="적용쿠폰">
                <p className="flex min-w-0 items-start gap-1.5 leading-5 text-muted">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="mt-0.5 shrink-0">
                    <path d="M3 2.5v6.2c0 1.2.8 2 2 2H11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M8.6 8.2 11 10.7 8.6 13.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>[{appliedCoupon.scope === "PRODUCT" ? "상품" : "장바구니"}] {appliedCoupon.name}</span>
                </p>
                <span className="shrink-0 leading-5 text-muted">-{formatPrice(appliedCoupon.discount)}</span>
              </div>
            ) : null}
          </div> : null}
          {delivery > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <span>배송비</span>
              <span data-testid="배송비" data-price={SHIPPING_FEE}>{formatPrice(SHIPPING_FEE)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
            <span className="font-semibold">예상 결제금액</span>
            <span className="text-lg font-bold" style={{ color: "#e10600" }} data-testid="예상결제금액" data-price={payable}>{formatPrice(payable)}</span>
          </div>
          <p className="text-xs leading-relaxed text-muted">{SHIPPING_NOTICE}</p>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold">적용 가능한 쿠폰</p>
            <Link href="/coupons" className="shrink-0 text-sm underline underline-offset-4">쿠폰 다운받기</Link>
          </div>
          {visibleCoupons.length > 0 ? (
            <div className="mt-3 space-y-2">
              {visibleCoupons.map((coupon) => (
                <form key={coupon.id} action={claimCoupon} className="flex items-center justify-between gap-3 border border-line px-3 py-2 text-sm">
                  <input type="hidden" name="couponId" value={coupon.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <span>{coupon.name} · {coupon.label}</span>
                  {coupon.owned ? <span className="text-muted">받은 쿠폰</span> : <button className="btn">쿠폰 다운</button>}
                </form>
              ))}
            </div>
          ) : null}
        </div>
        <p className="mt-8 max-w-md text-sm leading-7 text-muted" data-testid="상품설명">{product.description}</p>
        <p className="mt-6 text-sm" data-testid="재고" data-stock={product.stock} data-purchasable={product.stock > 0 ? "true" : "false"}>재고 {product.stock}개</p>
        <AddToCart productId={product.id} stock={product.stock} onePlusOne={product.onePlusOne} />
      </div>
    </div>
  );
}
