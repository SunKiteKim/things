import assert from "node:assert/strict";
import { test } from "node:test";
import { couponDiscount } from "../src/lib/discounts";
const now = new Date("2026-09-26T00:00:00Z");
const rule = { isActive: true, startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01"), maxUses: null, usedCount: 0, minOrderAmount: 0, minQuantity: 3, discountType: "PERCENT", discountValue: 10 };
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
});
