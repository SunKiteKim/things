import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { formatDate } from "@/lib/utils";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exhibition = await prisma.exhibition.findUnique({
    where: { slug },
    include: {
      products: { include: { product: true } },
    },
  });
  if (!exhibition) notFound();

  return (
    <div>
      <div className="relative mb-12 aspect-[21/8] overflow-hidden bg-ink">
        <Image src={exhibition.imageUrl} alt={exhibition.title} fill className="object-cover opacity-80" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 text-paper">
          <p className="text-sm">
            {formatDate(exhibition.startAt)} – {formatDate(exhibition.endAt)}
          </p>
          <h1 className="display mt-2 text-5xl">{exhibition.title}</h1>
        </div>
      </div>
      <p className="max-w-2xl text-muted">{exhibition.description}</p>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {exhibition.products.map((row) => (
          <ProductCard key={row.productId} product={row.product} />
        ))}
      </div>
    </div>
  );
}
