import assert from "node:assert/strict";
import test from "node:test";
import { paginationPages } from "../../src/lib/pagination.ts";

test("renders every page when the total is small", () => {
  assert.deepEqual(paginationPages(3, 5), [1, 2, 3, 4, 5]);
});

test("compresses pages around the current page", () => {
  assert.deepEqual(paginationPages(1, 10), [1, 2, "…", 10]);
  assert.deepEqual(paginationPages(5, 10), [1, "…", 4, 5, 6, "…", 10]);
  assert.deepEqual(paginationPages(10, 10), [1, "…", 9, 10]);
});
