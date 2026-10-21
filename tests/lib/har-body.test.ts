import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeBody,
  formatBytes,
  formatMs,
  isBinaryBody,
  prettyBody,
} from "../../src/lib/har/body.ts";

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

test("decodes textual base64 and rejects binary bodies", () => {
  assert.equal(decodeBody(undefined, undefined, undefined), null);
  assert.equal(decodeBody("plain", undefined, "text/plain"), "plain");
  assert.equal(decodeBody("aGVsbG8=", "base64", "text/plain"), "hello");
  assert.equal(decodeBody("aGVsbG8=", "base64", "application/json"), "hello");
  assert.equal(decodeBody("aGVsbG8=", "base64", "application/octet-stream"), null);
  assert.equal(decodeBody("%%%", "base64", "text/plain"), null);
});

test("detects binary base64 bodies", () => {
  assert.equal(isBinaryBody("base64", "application/octet-stream", "aGVsbG8="), true);
  assert.equal(isBinaryBody("base64", "text/plain", "aGVsbG8="), false);
  assert.equal(isBinaryBody(undefined, "text/plain", "aGVsbG8="), false);
  assert.equal(isBinaryBody("base64", "text/plain", undefined), false);
});

test("pretty-prints JSON bodies and leaves others unchanged", () => {
  assert.equal(prettyBody('{"a":1}', "application/json"), '{\n  "a": 1\n}');
  assert.equal(prettyBody("not json", "text/plain"), "not json");
  assert.equal(prettyBody("{bad", "application/json"), "{bad");
});
