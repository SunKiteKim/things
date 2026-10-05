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
  maxDiscountAmount?: number | null;
  includedProductIds: string;
  excludedProductIds: string;
  issues?: { targetType: string; userId: string | null; categoryId: string | null }[];
};

type CouponLine = { productId: string; categoryId?: string; amount: number; quantity: number; onePlusOne?: boolean };

function lineMatchesTarget(line: CouponLine, target?: string) {
  if (!target) return true;
  const [productId, flag] = target.toLowerCase().split(":");
  if (line.productId.toLowerCase() !== productId) return false;
  if (flag === "0" || flag === "1") return !!line.onePlusOne === (flag === "1");
  return true;
}

function parseProductIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
function cappedDiscount(amount: number, discount: number, maxDiscountAmount?: number | null) {
  const limit = maxDiscountAmount && maxDiscountAmount > 0 ? maxDiscountAmount : discount;
  return Math.min(amount, discount, limit);
}

export function couponDiscount(coupon: CouponRule, amount: number, quantity: number, now = new Date()): number | null {
  if (!coupon.isActive || coupon.isPaused || coupon.startAt > now || coupon.endAt < now || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) || amount < coupon.minOrderAmount || quantity < coupon.minQuantity || quantity <= 0) return null;
  if (!Number.isSafeInteger(coupon.discountValue) || coupon.discountValue < 0 || !["PERCENT", "AMOUNT"].includes(coupon.discountType) || (coupon.discountType === "PERCENT" && coupon.discountValue > 100)) return null;
  if (coupon.maxDiscountAmount != null && (!Number.isSafeInteger(coupon.maxDiscountAmount) || coupon.maxDiscountAmount < 0)) return null;
  const discount = coupon.discountType === "PERCENT" ? Math.floor(amount * coupon.discountValue / 100) : coupon.discountValue;
  return cappedDiscount(amount, discount, coupon.maxDiscountAmount);
}

function couponMatchingLines(coupon: CouponRule, lines: CouponLine[], userId?: string) {
  const included = new Set(parseProductIds(coupon.includedProductIds));
  const excluded = new Set(parseProductIds(coupon.excludedProductIds));
  const issues = coupon.issues ?? [];
  const userIssued = !!userId && issues.some((issue) => issue.targetType === "USER" && issue.userId === userId);
  const issuedCategoryIds = new Set(issues.filter((issue) => issue.targetType === "CATEGORY" && issue.categoryId).map((issue) => issue.categoryId as string));
  if (!userIssued && issuedCategoryIds.size === 0) return [];
  const eligibleLines = lines.filter((line) =>
    (included.size === 0 || included.has(line.productId)) &&
    !excluded.has(line.productId) &&
    (userIssued || (!!line.categoryId && issuedCategoryIds.has(line.categoryId))),
  );
  if (coupon.scope === "MULTI_CART" && new Set(eligibleLines.map((line) => line.productId)).size < 2) return [];
  return eligibleLines;
}

function productCouponLine(coupon: CouponRule, lines: CouponLine[], now: Date) {
  let best: CouponLine | undefined;
  let bestDiscount = 0;
  for (const line of lines) {
    const discount = couponDiscount(coupon, line.amount, line.quantity, now);
    if (discount != null && discount > bestDiscount) {
      best = line;
      bestDiscount = discount;
    }
  }
  return best ? [best] : [];
}

function linesForCoupon(coupon: CouponRule, lines: CouponLine[], now: Date, userId?: string, target?: string) {
  let eligibleLines = couponMatchingLines(coupon, lines, userId);
  if (target && (coupon.scope === "PRODUCT" || coupon.scope === "ONE_PLUS_ONE")) eligibleLines = eligibleLines.filter((line) => lineMatchesTarget(line, target));
  return coupon.scope === "PRODUCT" ? productCouponLine(coupon, eligibleLines, now) : eligibleLines;
}

export function couponEligibleProductIds(coupon: CouponRule, lines: CouponLine[], now = new Date(), userId?: string, target?: string) {
  const discount = couponDiscountForLines(coupon, lines, now, userId, target);
  if (discount == null || discount <= 0) return [];
  return linesForCoupon(coupon, lines, now, userId, target).map((line) => line.productId);
}

export function couponDiscountForLines(coupon: CouponRule, lines: CouponLine[], now = new Date(), userId?: string, target?: string): number | null {
  const eligibleLines = linesForCoupon(coupon, lines, now, userId, target);
  if (coupon.scope === "MULTI_CART" && new Set(eligibleLines.map((line) => line.productId)).size < 2) return null;
  if (eligibleLines.length === 0 && (coupon.issues ?? []).length > 0) return null;
  const amount = eligibleLines.reduce((sum, line) => sum + line.amount, 0);
  const quantity = eligibleLines.reduce((sum, line) => sum + line.quantity, 0);
  if (coupon.scope === "ONE_PLUS_ONE") {
    if (!coupon.isActive || coupon.isPaused || coupon.startAt > now || coupon.endAt < now || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) || amount < coupon.minOrderAmount || quantity < 2) return null;
    const discount = eligibleLines.reduce((sum, line) => sum + Math.floor(line.quantity / 2) * Math.floor(line.amount / line.quantity), 0);
    return discount > 0 ? cappedDiscount(amount, discount, coupon.maxDiscountAmount) : null;
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
