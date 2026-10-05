import assert from "node:assert/strict";
import { test } from "node:test";
import { couponCodes, couponSelection, couponTargets } from "../src/lib/checkout-pricing";
import { couponDiscount, couponDiscountForLines, couponEligibleProductIds } from "../src/lib/discounts";
const now = new Date("2026-09-26T00:00:00Z");
const rule = { scope: "CART", isActive: true, isPaused: false, startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01"), maxUses: null, usedCount: 0, minOrderAmount: 0, minQuantity: 3, discountType: "PERCENT", discountValue: 10, includedProductIds: "[]", excludedProductIds: "[]" };
test("quantity threshold and percentage rounding", () => {
 assert.equal(couponDiscount(rule, 10005, 2, now), null);
 assert.equal(couponDiscount(rule, 10005, 3, now), 1000);
 assert.equal(couponDiscount(rule, 10005, 4, now), 1000);
});
test("fixed discount cannot exceed payable subtotal", () => {
 assert.equal(couponDiscount({ ...rule, discountType: "AMOUNT", discountValue: 15000 }, 10000, 3, now), 10000);
});
test("date, usage and amount requirements remain enforced", () => {
 assert.equal(couponDiscount({ ...rule, isActive: false }, 10000, 3, now), null);
 assert.equal(couponDiscount({ ...rule, minOrderAmount: 20000 }, 10000, 3, now), null);
 assert.equal(couponDiscount({ ...rule, maxUses: 2, usedCount: 2 }, 10000, 3, now), null);
 assert.equal(couponDiscount(rule, 10000, 3, new Date("2028-01-01")), null);
 assert.equal(couponDiscount({ ...rule, discountValue: 101 }, 10000, 3, now), null);
 assert.equal(couponDiscount({ ...rule, maxDiscountAmount: 500 }, 100000, 3, now), 500);
});
const held = { targetType: "USER", userId: "member", categoryId: null };
test("product coupon applies to the single product with the larger discount", () => {
 const coupon = { ...rule, scope: "PRODUCT", minQuantity: 0, discountValue: 50, issues: [held] };
 const lines = [
  { productId: "small", amount: 31200, quantity: 1 },
  { productId: "large", amount: 908160, quantity: 1 },
 ];
 assert.equal(couponDiscountForLines(coupon, lines, now, "member"), 454080);
 assert.deepEqual(couponEligibleProductIds(coupon, lines, now, "member"), ["large"]);
});
test("product coupon stays on the product the shopper chose", () => {
 const coupon = { ...rule, scope: "PRODUCT", minQuantity: 0, discountValue: 50, issues: [held] };
 const lines = [
  { productId: "small", amount: 31200, quantity: 1 },
  { productId: "large", amount: 908160, quantity: 1 },
 ];
 assert.equal(couponDiscountForLines(coupon, lines, now, "member", "small"), 15600);
 assert.deepEqual(couponEligibleProductIds(coupon, lines, now, "member", "small"), ["small"]);
});
test("coupon selection keeps the mapped product", () => {
 assert.deepEqual(couponCodes("CPN-1@prd0014:0,CPN-2"), ["CPN-1", "CPN-2"]);
 assert.deepEqual(couponTargets("cpn-1@Prd0014:0"), { "CPN-1": "prd0014:0" });
 assert.deepEqual(couponSelection("cpn-1@prd0014:0,cpn-2"), ["CPN-1@prd0014:0", "CPN-2"]);
});
test("coupon does not apply before the member downloads it", () => {
 const coupon = { ...rule, scope: "PRODUCT", minQuantity: 0, discountValue: 50, issues: [] };
 const lines = [{ productId: "large", amount: 908160, quantity: 1 }];
 assert.equal(couponDiscountForLines(coupon, lines, now, "member"), null);
 assert.deepEqual(couponEligibleProductIds(coupon, lines, now, "member"), []);
});
