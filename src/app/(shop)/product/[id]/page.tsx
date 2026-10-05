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
import { SHIPPING_NOTICE, shippingFee } from "@/lib/checkout-pricing";

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
  const payable = couponPrice + shippingFee(couponPrice);
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
      <div className="md:sticky md:top-28 md:self-start">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">
          {product.category.name}
        </p>
        <p className="mt-3 text-[0.72rem] tracking-wide text-muted">{product.id}</p>
        <h1 className="product-name mt-1 text-5xl leading-snug">{product.name}</h1>
        <div className="mt-6 space-y-4 border-b border-line pb-5 text-sm">
          <div>
            {listPrice > salePrice ? <p className="text-right text-xs line-through" style={{ fontWeight: 400, color: "#c5c0b8" }}>{formatPrice(listPrice)}</p> : null}
            <div className="mt-1 flex items-start justify-between gap-4">
              <span>할인가</span>
              <p data-testid="product-sale-price">
                {rateLabel ? <span className="mr-2" style={{ color: "#e10600", fontWeight: 400 }}>{rateLabel}</span> : null}
                <span className="font-bold">{formatPrice(salePrice)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>쿠폰 할인가</span>
            <span className="font-bold" data-testid="product-coupon-price">{formatPrice(couponPrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
            <span className="font-semibold">예상 결제금액</span>
            <span className="text-lg font-bold" style={{ color: "#e10600" }} data-testid="product-payable">{formatPrice(payable)}</span>
          </div>
          <p className="text-xs leading-relaxed text-muted">{SHIPPING_NOTICE}</p>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold">받을 수 있는 쿠폰</p>
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
        <p className="mt-8 max-w-md text-sm leading-7 text-muted">{product.description}</p>
        <p className="mt-6 text-sm">재고 {product.stock}개</p>
        <AddToCart productId={product.id} stock={product.stock} onePlusOne={product.onePlusOne} />
      </div>
    </div>
  );
}
