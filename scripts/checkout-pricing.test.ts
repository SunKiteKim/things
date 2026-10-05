import assert from "node:assert/strict";
import { test } from "node:test";
import { combinedDiscount, couponCodes, selectedOffers, shippingFee, timeSalePrice, resolvedCouponSelection, allocateAmount, allocateCouponDiscounts, bestSingleProductCoupon } from "../src/lib/checkout-pricing";

test("shipping threshold uses discounted merchandise amount", () => {
  assert.equal(shippingFee(29999), 3000);
  assert.equal(shippingFee(30000), 0);
  assert.equal(shippingFee(30001), 0);
  assert.equal(shippingFee(30000 - 1000), 3000);
  assert.equal(shippingFee(0), 0);
});

test("resolved default and explicit selections retain coupon codes and product targets", () => {
  const offers = [{ code: "A", discount: 1000, isStackable: true }];
  assert.equal(resolvedCouponSelection(selectedOffers(offers, "", 10000), ""), "A");
  assert.equal(resolvedCouponSelection(offers, "a@prd1:1,EXPIRED@prd2:0"), "A@prd1:1");
  assert.equal(resolvedCouponSelection(selectedOffers(offers, "-", 10000), "-"), "");
});

test("applied coupon details sum exactly to the capped total, regardless of input order", () => {
  const offers = [{ code: "B", discount: 8000, isStackable: true }, { code: "A", discount: 6000, isStackable: true }];
  const applied = allocateCouponDiscounts(offers, 10000);
  assert.deepEqual(applied.map(offer => offer.amount), [6000, 3999]);
  assert.equal(applied.reduce((sum, offer) => sum + offer.amount, 0), 9999);
  assert.deepEqual(allocateCouponDiscounts([...offers].reverse(), 10000), applied);
  assert.throws(() => allocateCouponDiscounts([offers[0], { ...offers[1], isStackable: false }], 10000));
});

test("integer allocation preserves totals with awkward fractions and a tiny last item", () => {
  assert.deepEqual(allocateAmount(2, [1, 1, 1]), [1, 1, 0]);
  assert.deepEqual(allocateAmount(0, [100, 1]), [0, 0]);
  for (const weights of [[1, 1, 1, 1, 1], [999, 999, 1], [0, 8, 3]]) {
    for (let amount = 0; amount <= weights.reduce((sum, value) => sum + value, 0); amount++) {
      const shares = allocateAmount(amount, weights);
      assert.equal(shares.reduce((sum, value) => sum + value, 0), amount);
      assert.ok(shares.every((share, index) => share >= 0 && share <= weights[index]));
    }
  }
});

test("product coupon selection compares actual savings including caps, quantities and shipping", () => {
  const offer = (code: string, discount: number, target: string, isStackable = true) => ({ code, scope: "PRODUCT", discount, isStackable, productDiscounts: [{ productId: target, discount }] });
  const options = [offer("50_PERCENT_CAPPED", 1000, "p1"), offer("10_PERCENT", 5000, "p2")];
  assert.equal(bestSingleProductCoupon(options, "", 100000).selection, "10_PERCENT@p2:0");
  assert.equal(bestSingleProductCoupon([offer("BELOW_FREE_SHIPPING", 1000, "p1")], "", 30000).selection, "");
  assert.equal(bestSingleProductCoupon([offer("BIG_SAVING", 5000, "p1")], "", 30000).payable, 28000);
  const cart = { code: "CART", scope: "CART", discount: 7000, isStackable: true };
  assert.equal(bestSingleProductCoupon([...options, cart], "CART", 100000).payable, 88000);
  assert.equal(bestSingleProductCoupon([cart, offer("EXCLUSIVE", 5000, "p1", false)], "CART", 100000).selection, "CART");
});

test("stackable coupons combine while leaving at least one won", () => {
  const offers = [{ code: "A", discount: 3000, isStackable: true }, { code: "B", discount: 2000, isStackable: true }];
  assert.equal(combinedDiscount(offers, 10000), 5000);
  assert.equal(combinedDiscount(offers, 4000), 3999);
  assert.throws(() => combinedDiscount([offers[0], { ...offers[1], isStackable: false }], 10000));
  assert.deepEqual(couponCodes(" a, B,a "), ["A", "B"]);
});

test("default selection compares combined coupons to best exclusive coupon", () => {
  const offers = [{ code: "A", discount: 3000, isStackable: true }, { code: "B", discount: 2000, isStackable: true }, { code: "C", discount: 4500, isStackable: false }];
  assert.deepEqual(selectedOffers(offers, "", 10000).map(offer => offer.code), ["A", "B"]);
  assert.deepEqual(selectedOffers(offers, "C", 10000).map(offer => offer.code), ["C"]);
  assert.deepEqual(selectedOffers(offers, "-", 10000), []);
  assert.deepEqual(selectedOffers([...offers, { code: "D", discount: 6000, isStackable: false }], "", 10000).map(offer => offer.code), ["D"]);
});

test("time sale rounds unit price before quantity and coupon calculations", () => {
  assert.equal(timeSalePrice(10005, 15), 8504);
  assert.equal(timeSalePrice(10000, 0), 10000);
  assert.equal(timeSalePrice(10000, 100), 1);
  const subtotal = timeSalePrice(10000, 10) * 2;
  const discount = combinedDiscount([{ code: "A", discount: subtotal * 0.1, isStackable: true }], subtotal);
  assert.equal(subtotal - discount + shippingFee(subtotal - discount), 19200);
});

test("equal and excessive discounts leave one won and preserve total arithmetic", () => {
  for (const subtotal of [1, 1000, 50000]) {
    for (const offered of [subtotal - 1, subtotal, subtotal + 5000]) {
      const discount = combinedDiscount([{ code: "FULL", discount: offered, isStackable: true }], subtotal);
      const merchandise = subtotal - discount;
      assert.equal(merchandise, 1);
      assert.equal(merchandise + shippingFee(merchandise), 3001);
    }
  }
  assert.equal(combinedDiscount([], 0), 0);
  assert.equal(shippingFee(0), 0);
});

test("full promotional discount and tiny rounded prices still permit positive payment", () => {
  for (const price of [0, 1, 10000]) {
    const subtotal = timeSalePrice(price, 100);
    const discount = combinedDiscount([{ code: "EXTRA", discount: 5000, isStackable: true }], subtotal);
    assert.equal(subtotal, 1);
    assert.equal(discount, 0);
    assert.ok(subtotal - discount + shippingFee(subtotal - discount) > 0);
  }
  assert.equal(timeSalePrice(1, 99), 1);
});
