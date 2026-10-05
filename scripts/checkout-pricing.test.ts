import assert from "node:assert/strict";
import { test } from "node:test";
import { combinedDiscount, couponCodes, selectedOffers, shippingFee, timeSalePrice } from "../src/lib/checkout-pricing";

test("shipping threshold uses discounted merchandise amount", () => {
  assert.equal(shippingFee(49999), 3000);
  assert.equal(shippingFee(50000), 0);
  assert.equal(shippingFee(50001), 0);
  assert.equal(shippingFee(50000 - 1000), 3000);
  assert.equal(shippingFee(0), 0);
});

test("stackable coupons combine and cannot exceed merchandise total", () => {
  const offers = [{ code: "A", discount: 3000, isStackable: true }, { code: "B", discount: 2000, isStackable: true }];
  assert.equal(combinedDiscount(offers, 10000), 5000);
  assert.equal(combinedDiscount(offers, 4000), 4000);
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
  assert.equal(timeSalePrice(10000, 100), 0);
  const subtotal = timeSalePrice(10000, 10) * 2;
  const discount = combinedDiscount([{ code: "A", discount: subtotal * 0.1, isStackable: true }], subtotal);
  assert.equal(subtotal - discount + shippingFee(subtotal - discount), 19200);
});
