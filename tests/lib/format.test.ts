import assert from "node:assert/strict";
import test from "node:test";
import { formatBytes, formatMs } from "../../src/lib/format.ts";

test("formats byte sizes with the current unit rules", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(-1), "0 B");
  assert.equal(formatBytes(1), "1 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1024 * 1024), "1.0 MB");
});

test("formats milliseconds with the current rounding", () => {
  assert.equal(formatMs(0), "0ms");
  assert.equal(formatMs(999), "999ms");
  assert.equal(formatMs(1000), "1.00s");
  assert.equal(formatMs(1500), "1.50s");
});
