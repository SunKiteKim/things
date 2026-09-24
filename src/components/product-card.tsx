import Link from "next/link";
import Image from "next/image";
import type { Product } from "@prisma/client";
import { formatPrice } from "@/lib/utils";

export function ProductCard({
  product,
  showDiscountRate = false,
  showProductId = false,
}: {
  product: Product;
  showDiscountRate?: boolean;
  showProductId?: boolean;
}) {
  const originalPrice = product.originalPrice;
  const hasDiscount = product.discountRate > 0 && Boolean(originalPrice);
  const showOriginalPrice = Boolean(
    originalPrice && (showDiscountRate ? originalPrice !== product.price : hasDiscount),
  );

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-surface">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 25vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-normal text-muted">things</div>
        )}
      </div>
      <div className="mt-3">
        {showProductId ? (
          <p className="text-[0.72rem] tracking-wide text-muted">{product.id}</p>
        ) : null}
        <p className={`product-name text-[0.95rem] leading-snug ${showProductId ? "mt-1" : ""}`}>
          {product.name}
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm font-normal text-muted">
          {showDiscountRate ? (
            <span className="font-medium text-accent">{product.discountRate}%</span>
          ) : null}
          <span>{formatPrice(product.price)}</span>
          {showOriginalPrice && originalPrice ? (
            <span className="line-through opacity-60">{formatPrice(originalPrice)}</span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
