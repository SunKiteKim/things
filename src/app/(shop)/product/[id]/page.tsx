import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { priceProducts } from "@/lib/exhibition-offers";
import { downloadableCoupons, presentProducts, timeSaleRateForProduct } from "@/lib/store-price";
import { discountPercentLabel } from "@/lib/exhibition-price";
import { formatPrice, parseGallery } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { claimCoupon } from "@/actions/commerce";
import { AddToCart } from "@/components/add-to-cart";
import { ProductImage } from "@/components/product-image";
import { DEFAULT_PRODUCT_IMAGE } from "@/lib/default-product-image";

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
  const [[sale], [purchase], coupons, timeSaleRate] = await Promise.all([
    presentProducts([product], new Date(), session?.user.id),
    priceProducts([product]),
    downloadableCoupons(product, session?.user.id),
    timeSaleRateForProduct(product.id),
  ]);
  if (!sale || !purchase) notFound();
  const listPrice = product.originalPrice ?? product.price;
  const payment = timeSaleRate > 0 ? Math.round(sale.price * (100 - timeSaleRate) / 100) : sale.price;
  const rateLabel = listPrice > payment ? discountPercentLabel(listPrice, payment) : sale.exhibitionLabel;

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
        <p className="mt-5 flex flex-wrap items-baseline gap-x-2 text-xl font-normal text-muted">
          {rateLabel ? <span className="text-accent">{rateLabel}</span> : null}
          <span>{formatPrice(payment)}</span>
          {listPrice !== payment ? <span className="line-through opacity-60">{formatPrice(listPrice)}</span> : null}
        </p>
        {payment !== purchase.price ? (
          <p className="mt-2 text-sm text-muted">
            {`회원 할인가 ${formatPrice(purchase.price)}에 ${[
              sale.price < purchase.price ? "쿠폰" : "",
              timeSaleRate > 0 ? `타임세일 ${timeSaleRate}%` : "",
            ].filter(Boolean).join("과 ")}를 적용한 금액입니다.`}
          </p>
        ) : null}
        {coupons.length > 0 ? (
          <div className="mt-6 max-w-md space-y-2">
            <p className="text-sm font-semibold">받을 수 있는 쿠폰</p>
            {coupons.map((coupon) => (
              <form key={coupon.id} action={claimCoupon} className="flex items-center justify-between gap-3 border border-line px-3 py-2 text-sm">
                <input type="hidden" name="couponId" value={coupon.id} />
                <input type="hidden" name="productId" value={product.id} />
                <span>{coupon.name} · {coupon.label}</span>
                {coupon.owned ? <span className="text-muted">받은 쿠폰</span> : <button className="btn">쿠폰 다운</button>}
              </form>
            ))}
          </div>
        ) : null}
        <p className="mt-8 max-w-md text-sm leading-7 text-muted">{product.description}</p>
        <p className="mt-6 text-sm">재고 {product.stock}개</p>
        <AddToCart productId={product.id} stock={product.stock} onePlusOne={product.onePlusOne} />
      </div>
    </div>
  );
}
