import Link from "next/link";
import type { Product } from "@prisma/client";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/product-image";
import { ProductQuickActions } from "@/components/product-quick-actions";

export function ProductCard({
  product,
  showDiscountRate = false,
  showProductId = false,
  rank,
}: {
  product: Product & { exhibitionLabel?: string | null; couponPrice?: number };
  showDiscountRate?: boolean;
  showProductId?: boolean;
  rank?: number;
}) {
  const originalPrice = product.originalPrice;
  const hasDiscount = product.discountRate > 0 && Boolean(originalPrice);
  const showOriginalPrice = Boolean(
    originalPrice && (product.exhibitionLabel || showDiscountRate ? originalPrice !== product.price : hasDiscount),
  );

  return (
    <div className="group relative block" data-testid="상품카드" data-product-id={product.id} data-stock={product.stock} data-purchasable={product.stock > 0 ? "true" : "false"}>
      <div className="relative">
        <Link href={`/product/${product.id}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-surface">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover transition duration-500 md:group-hover:scale-[1.03]"
            />
            {rank ? (
              <span className="absolute left-3 top-3 z-20 grid h-8 min-w-8 place-items-center bg-ink px-2 text-sm font-semibold text-white">{rank}</span>
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 md:group-hover:bg-black/35 md:group-focus-within:bg-black/35" />
          </div>
        </Link>
        <ProductQuickActions productId={product.id} soldOut={product.stock <= 0} />
      </div>
      <Link href={`/product/${product.id}`} className="mt-3 block" data-testid="상품링크">
        {showProductId ? (
          <p className="text-[0.72rem] tracking-wide text-muted">{product.id}</p>
        ) : null}
        <p className={`product-name text-[0.95rem] leading-snug ${showProductId ? "mt-1" : ""}`}>
          {product.name}
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm font-normal text-muted">
          {product.exhibitionLabel ? (
            <span className="text-accent">{product.exhibitionLabel}</span>
          ) : showDiscountRate ? (
            <span className="text-accent">{product.discountRate}%</span>
          ) : null}
          <span data-testid="판매가" data-price={product.price}>{formatPrice(product.price)}</span>
          {showOriginalPrice && originalPrice ? (
            <span className="line-through opacity-60">{formatPrice(originalPrice)}</span>
          ) : null}
        </p>
        {product.couponPrice != null && product.couponPrice >= 0 && product.couponPrice < product.price ? <p className="mt-1 text-xs text-muted">쿠폰 적용 예상가 {formatPrice(product.couponPrice)}</p> : null}
      </Link>
    </div>
  );
}
