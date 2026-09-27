type CouponRule = {
  scope: string;
  isActive: boolean;
  isPaused: boolean;
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
  issues?: { targetType: string; userId: string | null; categoryId: string | null }[];
};

type CouponLine = { productId: string; categoryId?: string; amount: number; quantity: number };

function parseProductIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
export function couponDiscount(coupon: CouponRule, amount: number, quantity: number, now = new Date()): number | null {
  if (!coupon.isActive || coupon.isPaused || coupon.startAt > now || coupon.endAt < now || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) || amount < coupon.minOrderAmount || quantity < coupon.minQuantity || quantity <= 0) return null;
  if (!Number.isSafeInteger(coupon.discountValue) || coupon.discountValue < 0 || !["PERCENT", "AMOUNT"].includes(coupon.discountType) || (coupon.discountType === "PERCENT" && coupon.discountValue > 100)) return null;
  return Math.min(amount, coupon.discountType === "PERCENT" ? Math.floor(amount * coupon.discountValue / 100) : coupon.discountValue);
}

export function couponDiscountForLines(coupon: CouponRule, lines: CouponLine[], now = new Date(), userId?: string): number | null {
  const included = new Set(parseProductIds(coupon.includedProductIds));
  const excluded = new Set(parseProductIds(coupon.excludedProductIds));
  const issues = coupon.issues ?? [];
  const userIssued = !!userId && issues.some((issue) => issue.targetType === "USER" && issue.userId === userId);
  const issuedCategoryIds = new Set(issues.filter((issue) => issue.targetType === "CATEGORY" && issue.categoryId).map((issue) => issue.categoryId as string));
  if (issues.length > 0 && !userIssued && issuedCategoryIds.size === 0) return null;
  const eligibleLines = lines.filter((line) =>
    (included.size === 0 || included.has(line.productId)) &&
    !excluded.has(line.productId) &&
    (issues.length === 0 || userIssued || (!!line.categoryId && issuedCategoryIds.has(line.categoryId))),
  );
  if (coupon.scope === "MULTI_CART" && new Set(eligibleLines.map((line) => line.productId)).size < 2) return null;
  const amount = eligibleLines.reduce((sum, line) => sum + line.amount, 0);
  const quantity = eligibleLines.reduce((sum, line) => sum + line.quantity, 0);
  if (coupon.scope === "ONE_PLUS_ONE") {
    if (!coupon.isActive || coupon.isPaused || coupon.startAt > now || coupon.endAt < now || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) || amount < coupon.minOrderAmount || quantity < 2) return null;
    const discount = eligibleLines.reduce((sum, line) => sum + Math.floor(line.quantity / 2) * Math.floor(line.amount / line.quantity), 0);
    return discount > 0 ? Math.min(amount, discount) : null;
  }
  return couponDiscount(
    coupon.scope === "CART"
      ? { ...coupon, minQuantity: 0 }
      : coupon.scope === "MULTI_CART"
        ? { ...coupon, minQuantity: Math.max(2, coupon.minQuantity) }
        : coupon,
    amount,
    quantity,
    now,
  );
}
