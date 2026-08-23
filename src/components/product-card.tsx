import Link from "next/link";
import Image from "next/image";
import type { Product } from "@prisma/client";
import { formatPrice } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
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
        <p className="product-name text-[0.95rem] leading-snug">{product.name}</p>
        <p className="mt-1 text-sm font-normal text-muted">
          {formatPrice(product.price)}
          {product.discountRate > 0 && product.originalPrice ? (
            <span className="ml-2 line-through opacity-60">{formatPrice(product.originalPrice)}</span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
