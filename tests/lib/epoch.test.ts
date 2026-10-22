import assert from "node:assert/strict";
import test from "node:test";
import { fmtTz, getMs, pad, toLocalInput } from "../../src/lib/epoch.ts";

test("converts epoch units to milliseconds", () => {
  assert.equal(getMs(1, "seconds"), 1000);
  assert.equal(getMs(1, "milliseconds"), 1);
});

test("formats timestamps in the requested timezone", () => {
  const date = new Date("2024-01-01T00:00:00.000Z");

  assert.equal(fmtTz(date, "UTC"), "01/01/2024, 00:00:00");
  assert.equal(fmtTz(date, "Asia/Kolkata"), "01/01/2024, 05:30:00");
});

test("pads and formats local datetime input values", () => {
  assert.equal(pad(3), "03");
  assert.equal(toLocalInput(new Date(2024, 0, 2, 3, 4, 5)), "2024-01-02T03:04:05");
});
