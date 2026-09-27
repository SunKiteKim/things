type CouponRule = { isActive: boolean; startAt: Date; endAt: Date; maxUses: number | null; usedCount: number; minOrderAmount: number; minQuantity: number; discountType: string; discountValue: number };
export function couponDiscount(coupon: CouponRule, amount: number, quantity: number, now = new Date()): number | null {
  if (!coupon.isActive || coupon.startAt > now || coupon.endAt < now || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) || amount < coupon.minOrderAmount || quantity < coupon.minQuantity || quantity <= 0) return null;
  if (!Number.isSafeInteger(coupon.discountValue) || coupon.discountValue < 0 || !["PERCENT", "AMOUNT"].includes(coupon.discountType) || (coupon.discountType === "PERCENT" && coupon.discountValue > 100)) return null;
  return Math.min(amount, coupon.discountType === "PERCENT" ? Math.floor(amount * coupon.discountValue / 100) : coupon.discountValue);
}
