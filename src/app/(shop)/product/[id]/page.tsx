import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { priceProducts } from "@/lib/exhibition-offers";
import { downloadableCoupons, presentProducts } from "@/lib/store-price";
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
  const [[sale], [purchase], coupons] = await Promise.all([
    presentProducts([product], new Date(), session?.user.id),
    priceProducts([product]),
    downloadableCoupons(product, session?.user.id),
  ]);
  if (!sale || !purchase) notFound();

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
          {sale.exhibitionLabel ? (
            <span className="text-accent">{sale.exhibitionLabel}</span>
          ) : (
            <span className="text-accent">{product.discountRate}%</span>
          )}
          <span>{formatPrice(sale.price)}</span>
          {(sale.originalPrice ?? product.originalPrice) && (sale.originalPrice ?? product.originalPrice) !== sale.price ? (
            <span className="line-through opacity-60">{formatPrice(sale.originalPrice ?? product.originalPrice ?? sale.price)}</span>
          ) : null}
        </p>
        {purchase.price !== sale.price ? (
          <p className="mt-2 text-sm text-muted">쿠폰 없이 구매하면 {formatPrice(purchase.price)}입니다. 회원 할인과 기획전 할인이 함께 적용됩니다.</p>
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
