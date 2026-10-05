import type { Coupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export type CouponTone = "product" | "cart";

export type MemberCouponView = {
  id: string;
  name: string;
  tone: CouponTone;
  discount: string;
  basis: string;
  limit: string;
  period: string;
  endsLabel: string;
  owned: boolean;
  products: { id: string; name: string }[];
};

function parseIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function couponTone(scope: string): CouponTone {
  return scope === "CART" || scope === "MULTI_CART" ? "cart" : "product";
}

export function couponToneLabel(tone: CouponTone) {
  return tone === "product" ? "상품쿠폰" : "장바구니 쿠폰";
}

export function couponDiscountText(coupon: Pick<Coupon, "scope" | "discountType" | "discountValue">) {
  if (coupon.scope === "ONE_PLUS_ONE") return "1+1";
  return coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue);
}

export function couponBasisText(coupon: Pick<Coupon, "scope" | "minOrderAmount" | "minQuantity">) {
  if (coupon.minOrderAmount > 0) return `${formatPrice(coupon.minOrderAmount)} 이상 구매시`;
  if (coupon.minQuantity > 0) return `${coupon.minQuantity}개 이상 구매시`;
  if (coupon.scope === "ONE_PLUS_ONE") return "동일 상품 2개 구매시";
  return "금액 제한 없음";
}

export function couponLimitText(coupon: Pick<Coupon, "scope" | "includedProductIds" | "excludedProductIds" | "maxUses" | "maxDiscountAmount">) {
  const included = parseIds(coupon.includedProductIds);
  const excluded = parseIds(coupon.excludedProductIds);
  const bits: string[] = [];
  if (coupon.scope === "ONE_PLUS_ONE") bits.push("동일 상품 2개당 1개");
  if (coupon.scope === "MULTI_CART") bits.push("서로 다른 상품 2종 이상");
  if (included.length > 0) bits.push(`지정 상품 ${included.length}개`);
  if (excluded.length > 0) bits.push(`제외 상품 ${excluded.length}개`);
  if (coupon.maxUses != null) bits.push(`${coupon.maxUses}장 한정`);
  if (coupon.maxDiscountAmount > 0) bits.push(`최대 ${formatPrice(coupon.maxDiscountAmount)}`);
  return bits.length > 0 ? bits.join(" · ") : "제한 없음";
}

function seoulDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

export function couponPeriodText(endAt: Date) {
  const { year, month, day } = seoulDateParts(endAt);
  return `~${year.slice(2)}/${month}/${day}`;
}

export function couponEndsLabel(endAt: Date, now = new Date()) {
  const end = seoulDateParts(endAt);
  const today = seoulDateParts(now);
  const days = Math.round((Date.parse(`${end.year}-${end.month}-${end.day}`) - Date.parse(`${today.year}-${today.month}-${today.day}`)) / 86400000);
  const relative = days <= 0 ? "오늘" : `${days}일 남음`;
  return `${end.year}년 ${end.month}월 ${end.day}일 종료 (${relative})`;
}

export function toMemberCouponView(coupon: Coupon, owned: boolean, now = new Date(), names = new Map<string, string>()): MemberCouponView {
  return {
    id: coupon.id,
    name: coupon.name,
    tone: couponTone(coupon.scope),
    discount: couponDiscountText(coupon),
    basis: couponBasisText(coupon),
    limit: couponLimitText(coupon),
    period: couponPeriodText(coupon.endAt),
    endsLabel: couponEndsLabel(coupon.endAt, now),
    owned,
    products: parseIds(coupon.includedProductIds).map((id) => ({ id, name: names.get(id) ?? id })),
  };
}

async function namesFor(coupons: Pick<Coupon, "includedProductIds">[]) {
  const ids = [...new Set(coupons.flatMap((coupon) => parseIds(coupon.includedProductIds)))];
  if (!ids.length) return new Map<string, string>();
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(products.map((product) => [product.id, product.name]));
}

function isHeldActive(coupon: Coupon, now: Date) {
  if (!coupon.isActive || coupon.isPaused || coupon.endAt < now) return false;
  return coupon.maxUses == null || coupon.usedCount < coupon.maxUses;
}

export async function memberCoupons(userId: string, now = new Date()) {
  const issues = await prisma.couponIssue.findMany({
    where: { userId, targetType: "USER" },
    include: { coupon: true },
    orderBy: { createdAt: "desc" },
  });
  const held = issues.map((issue) => issue.coupon);
  const names = await namesFor(held);
  return {
    active: held.filter((coupon) => isHeldActive(coupon, now)).map((coupon) => toMemberCouponView(coupon, true, now, names)),
    expired: held.filter((coupon) => !isHeldActive(coupon, now)).map((coupon) => toMemberCouponView(coupon, true, now, names)),
  };
}

export async function downloadableMemberCoupons(userId?: string, now = new Date()) {
  const coupons = await prisma.coupon.findMany({
    where: { isActive: true, isPaused: false, startAt: { lte: now }, endAt: { gte: now } },
    include: {
      issues: {
        where: userId ? { userId, targetType: "USER" } : { id: { in: [] } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const visible = coupons.filter((coupon) => coupon.maxUses == null || coupon.usedCount < coupon.maxUses);
  const names = await namesFor(visible);
  return visible.map((coupon) => toMemberCouponView(coupon, coupon.issues.length > 0, now, names));
}
