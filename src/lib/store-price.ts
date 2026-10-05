import type { Coupon, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { couponDiscount } from "@/lib/discounts";
import { priceProducts } from "@/lib/exhibition-offers";
import { formatPrice } from "@/lib/utils";

type OfferCoupon = Coupon & {
  issues: { targetType: string; userId: string | null; categoryId: string | null }[];
};

export type DownloadableCoupon = {
  id: string;
  name: string;
  label: string;
  owned: boolean;
};

function parseIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function couponFitsProduct(
  coupon: OfferCoupon,
  product: { id: string; categoryId: string },
  userId?: string,
) {
  if (coupon.scope === "ONE_PLUS_ONE" || coupon.scope === "MULTI_CART") return false;
  const included = parseIds(coupon.includedProductIds);
  const excluded = parseIds(coupon.excludedProductIds);
  if (excluded.includes(product.id)) return false;
  if (included.length > 0 && !included.includes(product.id)) return false;
  if (coupon.issues.length === 0) return true;
  const userIssued = !!userId && coupon.issues.some((issue) => issue.targetType === "USER" && issue.userId === userId);
  const categoryIssued = coupon.issues.some((issue) => issue.targetType === "CATEGORY" && issue.categoryId === product.categoryId);
  return userIssued || categoryIssued;
}

function extraRate(type: string, value: number, base: number) {
  if (type === "PERCENT") return value;
  if (type === "AMOUNT" && base > 0) return (value / base) * 100;
  return 0;
}

function couponLabel(coupon: Pick<Coupon, "discountType" | "discountValue">) {
  return coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue);
}

async function liveCoupons(now: Date) {
  return prisma.coupon.findMany({
    where: { isActive: true, isPaused: false, startAt: { lte: now }, endAt: { gte: now } },
    include: { issues: true },
    orderBy: { discountValue: "desc" },
  });
}

export async function presentProducts<T extends Pick<Product, "id" | "price" | "originalPrice" | "categoryId">>(
  products: T[],
  now = new Date(),
  userId?: string,
) {
  const [priced, coupons] = await Promise.all([priceProducts(products, now), liveCoupons(now)]);
  return priced.map((product) => {
    const memberPrice = product.exhibitionLabel ? (product.originalPrice ?? product.price) : product.price;
    const exhibitionRate = memberPrice > product.price ? ((memberPrice - product.price) / memberPrice) * 100 : 0;
    let best = { rate: exhibitionRate, price: product.price, label: product.exhibitionLabel };
    for (const coupon of coupons) {
      if (!couponFitsProduct(coupon, product, userId)) continue;
      const discount = couponDiscount(coupon, memberPrice, 1, now);
      if (discount == null || discount <= 0) continue;
      const price = Math.max(0, memberPrice - discount);
      const rate = extraRate(coupon.discountType, coupon.discountValue, memberPrice);
      if (rate > best.rate + 0.001 || (Math.abs(rate - best.rate) <= 0.001 && price < best.price)) {
        best = { rate, price, label: `쿠폰 ${couponLabel(coupon)}` };
      }
    }
    if (!best.label || best.price === product.price) return product;
    return { ...product, price: best.price, originalPrice: memberPrice, exhibitionLabel: best.label };
  });
}

export async function downloadableCoupons(
  product: { id: string; categoryId: string },
  userId?: string,
  now = new Date(),
): Promise<DownloadableCoupon[]> {
  const coupons = await liveCoupons(now);
  return coupons.flatMap((coupon) => {
    if (!couponFitsProduct(coupon, product, userId) && !publicOrCategoryCoupon(coupon, product)) return [];
    if (parseIds(coupon.excludedProductIds).includes(product.id)) return [];
    const included = parseIds(coupon.includedProductIds);
    if (included.length > 0 && !included.includes(product.id)) return [];
    return [{
      id: coupon.id,
      name: coupon.name,
      label: couponLabel(coupon),
      owned: !!userId && coupon.issues.some((issue) => issue.targetType === "USER" && issue.userId === userId),
    }];
  });
}

function publicOrCategoryCoupon(coupon: OfferCoupon, product: { categoryId: string }) {
  if (coupon.scope === "ONE_PLUS_ONE" || coupon.scope === "MULTI_CART") return false;
  if (coupon.issues.length === 0) return true;
  return coupon.issues.some((issue) => issue.targetType === "CATEGORY" && issue.categoryId === product.categoryId);
}
