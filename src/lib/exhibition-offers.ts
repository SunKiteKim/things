import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { timeSalePrice } from "@/lib/checkout-pricing";
import { asExhibitionOffer, bestExhibitionOffer, discountPercentLabel, type ExhibitionOffer } from "@/lib/exhibition-price";

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
  const [grouped, section, placements] = await Promise.all([
    activeOffersByProduct(products.map((product) => product.id), now),
    prisma.displayItem.findFirst({ where: { pageKey: "home", slotKey: "section:timesale", isVisible: true } }),
    prisma.displayItem.findMany({ where: { pageKey: "home", slotKey: { in: products.map(product => `timesale-product:${product.id}`) }, kind: "product", isVisible: true } }),
  ]);
  const end = section?.href ? new Date(section.href) : null;
  const rate = section && (!end || (!Number.isNaN(end.getTime()) && end >= now)) ? Math.min(100, Math.max(0, Math.round(Number(section.icon) || 0))) : 0;
  const saleIds = new Set(placements.map(item => item.slotKey));
  return products.map((product) => {
    const best = bestExhibitionOffer(product.price, grouped.get(product.id) ?? []);
    const saleRate = saleIds.has(`timesale-product:${product.id}`) ? rate : 0;
    const price = timeSalePrice(best.price, saleRate);
    if (price === product.price) return { ...product, exhibitionLabel: null };
    return {
      ...product,
      price,
      originalPrice: product.originalPrice ?? product.price,
      exhibitionLabel: [best.offer ? `기획전 ${best.offer.discountType === "PERCENT" ? `${best.offer.discountValue}%` : discountPercentLabel(product.price, best.price)}` : "", saleRate ? `타임세일 ${saleRate}%` : ""].filter(Boolean).join(" · "),
    };
  });
}
