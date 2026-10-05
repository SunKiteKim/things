import assert from "node:assert/strict";
import { test } from "node:test";
import { pickToday, todayPickKey } from "../src/lib/today-pick";

const products = Array.from({ length: 20 }, (_, index) => ({ id: `prd${String(index + 1).padStart(4, "0")}` }));

test("sold-out products are excluded and small catalogs do not duplicate picks", () => {
  const catalog = [{ id: "soldout", stock: 0, price: 1000 }, { id: "a", stock: 2, price: 5000 }, { id: "b", stock: 1, price: 100000 }];
  const result = pickToday(catalog, 4, new Date("2026-10-05T06:00:00Z"));
  assert.equal(result.length, 2);
  assert.equal(new Set(result.map(product => product.id)).size, 2);
  assert.ok(result.every(product => product.stock > 0));
});

test("the daily pick stays the same until 00:00:01 in Seoul", () => {
  const before = new Date("2026-10-05T14:59:59.000Z");
  const atMidnight = new Date("2026-10-05T15:00:00.500Z");
  const after = new Date("2026-10-05T15:00:01.000Z");
  assert.equal(todayPickKey(before), "2026-10-05");
  assert.equal(todayPickKey(atMidnight), "2026-10-05");
  assert.equal(todayPickKey(after), "2026-10-06");
  assert.deepEqual(pickToday(products, 4, before).map((product) => product.id), pickToday(products, 4, atMidnight).map((product) => product.id));
  assert.notDeepEqual(pickToday(products, 4, atMidnight).map((product) => product.id), pickToday(products, 4, after).map((product) => product.id));
});

test("one daily pick is priced at 30000 or below", () => {
  const priced = [
    ...Array.from({ length: 12 }, (_, index) => ({ id: `high${index}`, price: 80000 + index })),
    { id: "low-a", price: 12000 },
    { id: "low-b", price: 30000 },
  ];
  for (let day = 1; day <= 20; day += 1) {
    const picked = pickToday(priced, 4, new Date(Date.UTC(2026, 0, day, 15, 0, 1)));
    assert.equal(picked.length, 4);
    assert.equal(picked.some((product) => product.price <= 30000), true);
  }
  const expensive = Array.from({ length: 8 }, (_, index) => ({ id: `only${index}`, price: 50000 }));
  assert.equal(pickToday(expensive, 4, new Date("2026-10-05T06:00:00.000Z")).every((product) => product.price > 30000), true);
});
test("each published product can be chosen", () => {
  const seen = new Set<string>();
  for (let day = 1; day <= 40; day += 1) {
    const now = new Date(Date.UTC(2026, 0, day, 15, 0, 1));
    for (const product of pickToday(products, 4, now)) seen.add(product.id);
  }
  assert.equal(seen.size, products.length);
});
