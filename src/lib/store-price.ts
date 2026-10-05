import type { Coupon, Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { couponDiscount } from "@/lib/discounts";
import { priceProducts } from "@/lib/exhibition-offers";
import { discountPercentLabel } from "@/lib/exhibition-price";
import { MINIMUM_MERCHANDISE_AMOUNT } from "@/lib/checkout-pricing";

type OfferCoupon = Coupon & {
  issues: { targetType: string; userId: string | null; categoryId: string | null }[];
};

export type DownloadableCoupon = {
  id: string;
  name: string;
  label: string;
  owned: boolean;
  rate: number;
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
  const userIssued = !!userId && coupon.issues.some((issue) => issue.targetType === "USER" && issue.userId === userId);
  const categoryIssued = coupon.issues.some((issue) => issue.targetType === "CATEGORY" && issue.categoryId === product.categoryId);
  return userIssued || categoryIssued;
}

function couponLabel(coupon: Pick<Coupon, "discountType" | "discountValue" | "maxDiscountAmount">, base = 0, price = 0) {
  const raw = coupon.discountType === "PERCENT" ? Math.floor(base * coupon.discountValue / 100) : coupon.discountValue;
  if (coupon.maxDiscountAmount > 0 && raw > coupon.maxDiscountAmount && base > price) return discountPercentLabel(base, price);
  if (coupon.discountType === "AMOUNT" && base > price) return discountPercentLabel(base, price);
  return coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : discountPercentLabel(base, Math.max(0, base - coupon.discountValue));
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
  const catalogOriginal = new Map(products.map((product) => [product.id, product.originalPrice]));
  const [priced, coupons] = await Promise.all([priceProducts(products, now), liveCoupons(now)]);
  return priced.map((product) => {
    const listPrice = catalogOriginal.get(product.id) ?? product.originalPrice ?? product.price;
    let couponOff = 0;
    for (const coupon of coupons) {
      if (!couponFitsProduct(coupon, product, userId)) continue;
      const discount = couponDiscount(coupon, product.price, 1, now);
      if (discount != null && discount > couponOff) couponOff = discount;
    }
    const price = Math.max(MINIMUM_MERCHANDISE_AMOUNT, product.price - couponOff);
    if (couponOff === 0 && !product.exhibitionLabel) return { ...product, originalPrice: listPrice };
    return {
      ...product,
      price,
      originalPrice: listPrice,
      exhibitionLabel: listPrice > price ? discountPercentLabel(listPrice, price) : product.exhibitionLabel,
    };
  });
}

export async function timeSaleRateForProduct(productId: string, now = new Date()) {
  const [section, placed] = await Promise.all([
    prisma.displayItem.findFirst({ where: { pageKey: "home", slotKey: "section:timesale", isVisible: true } }),
    prisma.displayItem.findFirst({ where: { pageKey: "home", slotKey: `timesale-product:${productId}`, kind: "product", isVisible: true } }),
  ]);
  if (!section || !placed) return 0;
  const ends = section.href ? new Date(section.href) : null;
  if (ends && !Number.isNaN(ends.getTime()) && ends < now) return 0;
  return Math.min(100, Math.max(0, Math.round(Number(section.icon) || 0)));
}

export async function downloadableCoupons(
  product: { id: string; categoryId: string; price?: number },
  userId?: string,
  now = new Date(),
): Promise<DownloadableCoupon[]> {
  const coupons = await liveCoupons(now);
  const price = product.price ?? 0;
  return coupons.flatMap((coupon) => {
    if (!couponListedForProduct(coupon, product, userId)) return [];
    const rate = applicableRate(coupon, price, now);
    return [{
      id: coupon.id,
      name: coupon.name,
      label: coupon.scope === "ONE_PLUS_ONE"
        ? "1+1"
        : coupon.scope === "MULTI_CART"
          ? `${coupon.discountValue}%`
          : couponLabel(coupon, price, Math.max(0, price - (coupon.discountType === "AMOUNT" ? coupon.discountValue : 0))),
      owned: !!userId && coupon.issues.some((issue) => issue.targetType === "USER" && issue.userId === userId),
      rate,
    }];
  }).sort((left, right) => right.rate - left.rate || right.label.localeCompare(left.label));
}

function applicableRate(coupon: OfferCoupon, price: number, now: Date) {
  if (coupon.scope === "ONE_PLUS_ONE") return 50;
  const discount = couponDiscount(coupon, price, Math.max(1, coupon.minQuantity || 1), now);
  if (discount != null && discount > 0 && price > 0) return (discount / price) * 100;
  return 0;
}

function couponListedForProduct(
  coupon: OfferCoupon,
  product: { id: string; categoryId: string },
  userId?: string,
) {
  if (coupon.scope === "ONE_PLUS_ONE" || coupon.scope === "MULTI_CART") {
    const included = parseIds(coupon.includedProductIds);
    const excluded = parseIds(coupon.excludedProductIds);
    if (excluded.includes(product.id)) return false;
    if (included.length > 0 && !included.includes(product.id)) return false;
    if (coupon.issues.length === 0) return false;
    const userIssued = !!userId && coupon.issues.some((issue) => issue.targetType === "USER" && issue.userId === userId);
    const categoryIssued = coupon.issues.some((issue) => issue.targetType === "CATEGORY" && issue.categoryId === product.categoryId);
    return userIssued || categoryIssued;
  }
  return couponFitsProduct(coupon, product, userId) || publicOrCategoryCoupon(coupon, product);
}
function publicOrCategoryCoupon(coupon: OfferCoupon, product: { categoryId: string }) {
  if (coupon.scope === "ONE_PLUS_ONE" || coupon.scope === "MULTI_CART") return false;
  if (coupon.issues.length === 0) return false;
  return coupon.issues.some((issue) => issue.targetType === "CATEGORY" && issue.categoryId === product.categoryId);
}
