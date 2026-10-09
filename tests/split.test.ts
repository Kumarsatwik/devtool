import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SPLIT_PERCENT,
  MIN_SPLIT_PERCENT,
  clampPixels,
  nextSplitPercentFromKey,
  splitPercentFromPointer,
} from "../src/lib/split.ts";

test("clamps a pointer position to the share bounds", () => {
  // 250px into a 1000px container starting at x=100 -> 25%
  assert.equal(splitPercentFromPointer(350, 100, 1000), 25);
  assert.equal(splitPercentFromPointer(0, 100, 1000), MIN_SPLIT_PERCENT);
  assert.equal(splitPercentFromPointer(5000, 100, 1000), MAX_SPLIT_PERCENT);
});

test("ignores a pointer when the container has no measurable width", () => {
  assert.equal(splitPercentFromPointer(350, 100, 0), null);
});

test("arrow keys step the share and stop at the bounds", () => {
  assert.equal(nextSplitPercentFromKey(50, "ArrowLeft"), 48);
  assert.equal(nextSplitPercentFromKey(50, "ArrowRight"), 52);
  assert.equal(nextSplitPercentFromKey(MIN_SPLIT_PERCENT, "ArrowLeft"), MIN_SPLIT_PERCENT);
  assert.equal(nextSplitPercentFromKey(MAX_SPLIT_PERCENT, "ArrowRight"), MAX_SPLIT_PERCENT);
});

test("Home and End jump to the bounds", () => {
  assert.equal(nextSplitPercentFromKey(50, "Home"), MIN_SPLIT_PERCENT);
  assert.equal(nextSplitPercentFromKey(50, "End"), MAX_SPLIT_PERCENT);
});

test("unhandled keys return null so the divider keeps default behavior", () => {
  assert.equal(nextSplitPercentFromKey(50, "ArrowUp"), null);
  assert.equal(nextSplitPercentFromKey(50, "Enter"), null);
});

test("clamps pixel sizes", () => {
  assert.equal(clampPixels(500, 320, 960), 500);
  assert.equal(clampPixels(100, 320, 960), 320);
  assert.equal(clampPixels(2000, 320, 960), 960);
});
