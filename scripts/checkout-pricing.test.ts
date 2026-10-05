import assert from "node:assert/strict";
import { test } from "node:test";
import { combinedDiscount, couponCodes, selectedOffers, shippingFee, timeSalePrice } from "../src/lib/checkout-pricing";

test("shipping threshold uses discounted merchandise amount", () => {
  assert.equal(shippingFee(29999), 3000);
  assert.equal(shippingFee(30000), 0);
  assert.equal(shippingFee(30001), 0);
  assert.equal(shippingFee(30000 - 1000), 3000);
  assert.equal(shippingFee(0), 0);
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
