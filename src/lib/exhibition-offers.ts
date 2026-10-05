import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asExhibitionOffer, bestExhibitionOffer, exhibitionOfferLabel, type ExhibitionOffer } from "@/lib/exhibition-price";

export type PricedProduct<T> = T & { exhibitionLabel: string | null };

export async function activeOffersByProduct(productIds: string[], now = new Date()) {
  const unique = [...new Set(productIds.filter(Boolean))];
  const grouped = new Map<string, ExhibitionOffer[]>();
  if (!unique.length) return grouped;
  const rows = await prisma.exhibitionProduct.findMany({
    where: {
      productId: { in: unique },
      exhibition: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
        discountType: { in: ["PERCENT", "AMOUNT"] },
        discountValue: { gt: 0 },
      },
    },
    select: {
      productId: true,
      exhibition: { select: { discountType: true, discountValue: true } },
    },
  });
  for (const row of rows) {
    const offer = asExhibitionOffer(row.exhibition.discountType, row.exhibition.discountValue);
    if (!offer) continue;
    grouped.set(row.productId, [...(grouped.get(row.productId) ?? []), offer]);
  }
  return grouped;
}

export async function priceProducts<T extends Pick<Product, "id" | "price" | "originalPrice">>(products: T[], now = new Date()): Promise<PricedProduct<T>[]> {
  const grouped = await activeOffersByProduct(products.map((product) => product.id), now);
  return products.map((product) => {
    const best = bestExhibitionOffer(product.price, grouped.get(product.id) ?? []);
    if (!best.offer || best.price === product.price) return { ...product, exhibitionLabel: null };
    return {
      ...product,
      price: best.price,
      originalPrice: product.price,
      exhibitionLabel: `기획전 ${exhibitionOfferLabel(best.offer)}`,
    };
  });
}
