type CouponRule = {
  scope: string;
  isActive: boolean;
  startAt: Date;
  endAt: Date;
  maxUses: number | null;
  usedCount: number;
  minOrderAmount: number;
  minQuantity: number;
  discountType: string;
  discountValue: number;
  includedProductIds: string;
  excludedProductIds: string;
};

type CouponLine = { productId: string; amount: number; quantity: number };

function parseProductIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
export function couponDiscount(coupon: CouponRule, amount: number, quantity: number, now = new Date()): number | null {
  if (!coupon.isActive || coupon.startAt > now || coupon.endAt < now || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) || amount < coupon.minOrderAmount || quantity < coupon.minQuantity || quantity <= 0) return null;
  if (!Number.isSafeInteger(coupon.discountValue) || coupon.discountValue < 0 || !["PERCENT", "AMOUNT"].includes(coupon.discountType) || (coupon.discountType === "PERCENT" && coupon.discountValue > 100)) return null;
  return Math.min(amount, coupon.discountType === "PERCENT" ? Math.floor(amount * coupon.discountValue / 100) : coupon.discountValue);
}

export function couponDiscountForLines(coupon: CouponRule, lines: CouponLine[], now = new Date()): number | null {
  const included = new Set(parseProductIds(coupon.includedProductIds));
  const excluded = new Set(parseProductIds(coupon.excludedProductIds));
  const eligibleLines = lines.filter((line) => (included.size === 0 || included.has(line.productId)) && !excluded.has(line.productId));
  const amount = eligibleLines.reduce((sum, line) => sum + line.amount, 0);
  const quantity = eligibleLines.reduce((sum, line) => sum + line.quantity, 0);
  return couponDiscount(
    coupon.scope === "CART" ? { ...coupon, minQuantity: Math.max(2, coupon.minQuantity) } : coupon,
    amount,
    quantity,
    now,
  );
}
