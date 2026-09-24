import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, parseGallery } from "@/lib/utils";
import { AddToCart } from "@/components/add-to-cart";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product || !product.isPublished) notFound();
  const gallery = [product.imageUrl, ...parseGallery(product.gallery)].filter(Boolean);

  return (
    <div className="grid gap-12 md:grid-cols-2">
      <div className="space-y-3">
        {gallery.map((src) => (
          <div key={src} className="relative aspect-[4/5] overflow-hidden bg-surface">
            <Image src={src} alt={product.name} fill className="object-cover" />
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
          <span className="font-medium text-accent">{product.discountRate}%</span>
          <span>{formatPrice(product.price)}</span>
          {product.originalPrice && product.originalPrice !== product.price ? (
            <span className="line-through opacity-60">{formatPrice(product.originalPrice)}</span>
          ) : null}
        </p>
        <p className="mt-8 max-w-md text-sm leading-7 text-muted">{product.description}</p>
        <p className="mt-6 text-sm">재고 {product.stock}개</p>
        <AddToCart productId={product.id} stock={product.stock} />
      </div>
    </div>
  );
}
