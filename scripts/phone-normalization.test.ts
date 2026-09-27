import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhone } from "../src/lib/phone.ts";

test("normalizes Korean mobile phone numbers", () => {
  assert.equal(normalizePhone("+821011112222"), "01011112222");
  assert.equal(normalizePhone("+82 10-1111-2222"), "01011112222");
  assert.equal(normalizePhone("0082-10-1111-2222"), "01011112222");
  assert.equal(normalizePhone("010-1111-2222"), "01011112222");
});
