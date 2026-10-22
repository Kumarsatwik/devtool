import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeBody,
  isBinaryBody,
  prettyBody,
} from "../../src/lib/har/body.ts";

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
