import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { priceProducts } from "@/lib/exhibition-offers";
import { ProductCard } from "@/components/product-card";
import { asExhibitionOffer, exhibitionOfferLabel } from "@/lib/exhibition-price";
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
  const now = new Date();
  const offer = asExhibitionOffer(exhibition.discountType, exhibition.discountValue);
  const live = exhibition.isActive && exhibition.startAt <= now && exhibition.endAt >= now;
  const products = await priceProducts(exhibition.products.map((row) => row.product), now);

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
      {offer ? (
        <p className="mt-4 text-sm">
          기획전 할인 {exhibitionOfferLabel(offer)}
          {live ? " · 등록 상품 판매가에 적용 중" : " · 진행 기간에 판매가에 적용됩니다"}
        </p>
      ) : null}
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
