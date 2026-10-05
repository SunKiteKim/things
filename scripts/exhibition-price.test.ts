import assert from "node:assert/strict";
import { test } from "node:test";
import { bestExhibitionOffer, exhibitionUnitPrice } from "../src/lib/exhibition-price";

test("percent and amount exhibition discounts", () => {
  assert.equal(exhibitionUnitPrice(10000, { discountType: "PERCENT", discountValue: 10 }), 9000);
  assert.equal(exhibitionUnitPrice(10000, { discountType: "AMOUNT", discountValue: 1500 }), 8500);
  assert.equal(exhibitionUnitPrice(1000, { discountType: "AMOUNT", discountValue: 5000 }), 0);
  assert.equal(exhibitionUnitPrice(10000, { discountType: "PERCENT", discountValue: 101 }), 10000);
});

test("best active exhibition discount wins", () => {
  const best = bestExhibitionOffer(10000, [
    { discountType: "PERCENT", discountValue: 10 },
    { discountType: "AMOUNT", discountValue: 2500 },
  ]);
  assert.equal(best.price, 7500);
  assert.equal(best.offer?.discountType, "AMOUNT");
});
