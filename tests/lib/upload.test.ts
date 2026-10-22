import assert from "node:assert/strict";
import test from "node:test";
import { fileSizeError, MAX_UPLOAD_MB } from "../../src/lib/upload.ts";

test("accepts files at or below the upload limit", () => {
  assert.equal(MAX_UPLOAD_MB, 10);
  assert.equal(fileSizeError({ name: "small.xlsx", size: 1024 }), null);
  assert.equal(
    fileSizeError({ name: "limit.xlsx", size: 10 * 1024 * 1024 }),
    null,
  );
});

test("rejects files above the upload limit", () => {
  assert.match(
    fileSizeError({ name: "big.xlsx", size: 10 * 1024 * 1024 + 1 }) ?? "",
    /"big\.xlsx" is too large/,
  );
  assert.equal(
    fileSizeError({ name: "x", size: 1024 * 1024 + 1 }, 1),
    '"x" is too large. Uploads are limited to 1MB.',
  );
});
