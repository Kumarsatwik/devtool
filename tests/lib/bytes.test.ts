import assert from "node:assert/strict";
import test from "node:test";
import { byteLength } from "../../src/lib/bytes.ts";

test("measures UTF-8 byte length", () => {
  assert.equal(byteLength("hello"), 5);
  assert.equal(byteLength("é"), 2);
  assert.equal(byteLength("👋"), 4);
  assert.equal(byteLength(""), 0);
});
