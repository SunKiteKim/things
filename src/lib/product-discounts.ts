import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asExhibitionOffer, exhibitionOfferLabel, exhibitionUnitPrice } from "@/lib/exhibition-price";
import { couponDiscount } from "@/lib/discounts";
import { presentProducts } from "@/lib/store-price";
import { discountedPrice, formatPrice } from "@/lib/utils";

export type DiscountLine = {
  name: string;
  detail: string;
  priceLabel: string;
};

export type DiscountBoard = {
  lines: DiscountLine[];
  purchasePrice: number;
  shownPrice: number;
  shownLabel: string;
};

type ListedProduct = Pick<Product, "id" | "price" | "originalPrice" | "discountRate" | "categoryId">;

function parseIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function discountBoards(products: ListedProduct[], now = new Date()) {
  const ids = products.map((product) => product.id);
  const [exhibitions, coupons, presented] = await Promise.all([
    prisma.exhibition.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
        products: { some: { productId: { in: ids } } },
      },
      include: { products: { select: { productId: true } } },
    }),
    prisma.coupon.findMany({
      where: { isActive: true, isPaused: false, startAt: { lte: now }, endAt: { gte: now } },
      include: { issues: { select: { targetType: true, categoryId: true } } },
    }),
    presentProducts(products, now),
  ]);
  const shownById = new Map(presented.map((product) => [product.id, product]));

  return new Map(products.map((product) => {
    const listPrice = product.originalPrice ?? product.price;
    const memberPrice = product.discountRate > 0 ? discountedPrice(listPrice, product.discountRate) : product.price;
    const lines: DiscountLine[] = [{
      name: "회원 할인",
      detail: product.discountRate > 0 ? `${product.discountRate}% · 판매가 ${formatPrice(listPrice)}에서 우선 적용` : "할인 없음 · 판매가가 기준가",
      priceLabel: formatPrice(memberPrice),
    }];
    let purchasePrice = memberPrice;
    for (const exhibition of exhibitions) {
      if (!exhibition.products.some((row) => row.productId === product.id)) continue;
      const offer = asExhibitionOffer(exhibition.discountType, exhibition.discountValue);
      if (!offer) continue;
      const price = exhibitionUnitPrice(memberPrice, offer);
      purchasePrice = Math.min(purchasePrice, price);
      lines.push({
        name: `기획전 · ${exhibition.title}`,
        detail: `${exhibitionOfferLabel(offer)} · 회원 할인가에 추가 적용`,
        priceLabel: formatPrice(price),
      });
    }
    for (const coupon of coupons) {
      const included = parseIds(coupon.includedProductIds);
      const excluded = parseIds(coupon.excludedProductIds);
      if (excluded.includes(product.id)) continue;
      if (included.length > 0 && !included.includes(product.id)) continue;
      const categoryLimited = coupon.issues.some((issue) => issue.targetType === "CATEGORY");
      const categoryMatch = coupon.issues.some((issue) => issue.targetType === "CATEGORY" && issue.categoryId === product.categoryId);
      if (categoryLimited && !categoryMatch && coupon.issues.every((issue) => issue.targetType === "CATEGORY")) continue;
      const label = coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue);
      const discount = coupon.scope === "ONE_PLUS_ONE" || coupon.scope === "MULTI_CART"
        ? null
        : couponDiscount({
          scope: coupon.scope,
          isActive: coupon.isActive,
          isPaused: coupon.isPaused,
          startAt: coupon.startAt,
          endAt: coupon.endAt,
          maxUses: coupon.maxUses,
          usedCount: coupon.usedCount,
          minOrderAmount: coupon.minOrderAmount,
          minQuantity: coupon.minQuantity,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscountAmount: coupon.maxDiscountAmount,
          includedProductIds: coupon.includedProductIds,
          excludedProductIds: coupon.excludedProductIds,
        }, memberPrice, 1, now);
      lines.push({
        name: `쿠폰 · ${coupon.name}`,
        detail: `${label} · ${coupon.code}${coupon.scope === "ONE_PLUS_ONE" || coupon.scope === "MULTI_CART" ? " · 장바구니에서 조건 충족 시 적용" : " · 회원 할인가 기준"}`,
        priceLabel: discount == null ? "-" : formatPrice(Math.max(0, memberPrice - discount)),
      });
    }
    const shown = shownById.get(product.id);
    return [product.id, {
      lines,
      purchasePrice,
      shownPrice: shown?.price ?? purchasePrice,
      shownLabel: shown?.exhibitionLabel ?? (product.discountRate > 0 ? `회원 할인 ${product.discountRate}%` : "할인 없음"),
    } satisfies DiscountBoard] as const;
  }));
}
