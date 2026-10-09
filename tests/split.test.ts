import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SPLIT_PERCENT,
  MIN_SPLIT_PERCENT,
  SPLIT_STEP_PERCENT,
  clampPixels,
  clampSplitPercent,
  nextSplitPercentFromKey,
  splitPercentFromPointer,
} from "../src/lib/split.ts";

test("clamps split shares into range", () => {
  assert.equal(clampSplitPercent(50), 50);
  assert.equal(clampSplitPercent(-10), MIN_SPLIT_PERCENT);
  assert.equal(clampSplitPercent(150), MAX_SPLIT_PERCENT);
});

test("clampSplitPercent falls back to the minimum for non-finite input", () => {
  assert.equal(clampSplitPercent(Number.NaN), MIN_SPLIT_PERCENT);
  assert.equal(clampSplitPercent(Number.POSITIVE_INFINITY), MAX_SPLIT_PERCENT);
  assert.equal(clampSplitPercent(Number.NEGATIVE_INFINITY), MIN_SPLIT_PERCENT);
});

test("clampSplitPercent honours custom bounds", () => {
  assert.equal(clampSplitPercent(10, 30, 70), 30);
  assert.equal(clampSplitPercent(90, 30, 70), 70);
  assert.equal(clampSplitPercent(45, 30, 70), 45);
});

test("maps pointer position onto the container width", () => {
  // 250px into a 1000px container starting at x=100 -> 25%
  assert.equal(splitPercentFromPointer(350, 100, 1000), 25);
});

test("pointer mapping clamps outside the container and ignores zero width", () => {
  assert.equal(splitPercentFromPointer(0, 100, 1000), MIN_SPLIT_PERCENT);
  assert.equal(splitPercentFromPointer(5000, 100, 1000), MAX_SPLIT_PERCENT);
  assert.equal(splitPercentFromPointer(350, 100, 0), null);
  assert.equal(splitPercentFromPointer(Number.NaN, 100, 1000), null);
});

test("arrow keys step the split by the configured increment", () => {
  assert.equal(nextSplitPercentFromKey(50, "ArrowLeft"), 50 - SPLIT_STEP_PERCENT);
  assert.equal(nextSplitPercentFromKey(50, "ArrowRight"), 50 + SPLIT_STEP_PERCENT);
});

test("arrow keys stop at the split bounds", () => {
  assert.equal(nextSplitPercentFromKey(MIN_SPLIT_PERCENT, "ArrowLeft"), MIN_SPLIT_PERCENT);
  assert.equal(nextSplitPercentFromKey(MAX_SPLIT_PERCENT, "ArrowRight"), MAX_SPLIT_PERCENT);
});

test("Home and End jump to the split bounds", () => {
  assert.equal(nextSplitPercentFromKey(50, "Home"), MIN_SPLIT_PERCENT);
  assert.equal(nextSplitPercentFromKey(50, "End"), MAX_SPLIT_PERCENT);
});

test("unhandled keys return null so the caller keeps default behavior", () => {
  assert.equal(nextSplitPercentFromKey(50, "ArrowUp"), null);
  assert.equal(nextSplitPercentFromKey(50, "a"), null);
  assert.equal(nextSplitPercentFromKey(50, "Enter"), null);
});

test("custom step scales the arrow-key delta", () => {
  assert.equal(nextSplitPercentFromKey(50, "ArrowLeft", MIN_SPLIT_PERCENT, MAX_SPLIT_PERCENT, 5), 45);
  assert.equal(nextSplitPercentFromKey(50, "ArrowRight", MIN_SPLIT_PERCENT, MAX_SPLIT_PERCENT, 10), 60);
});

test("clamps pixel sizes and rejects non-finite input", () => {
  assert.equal(clampPixels(500, 320, 960), 500);
  assert.equal(clampPixels(100, 320, 960), 320);
  assert.equal(clampPixels(2000, 320, 960), 960);
  assert.equal(clampPixels(Number.NaN, 320, 960), 320);
});
