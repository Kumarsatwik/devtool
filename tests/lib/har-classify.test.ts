import assert from "node:assert/strict";
import test from "node:test";
import { baseDomain, categorize } from "../../src/lib/har/classify.ts";
import type { HarEntry } from "../../src/lib/har/types.ts";

const entry: HarEntry = {
  request: { method: "GET", url: "https://example.test/" },
  response: { status: 200 },
};

test("baseDomain keeps the current last-two-labels heuristic", () => {
  assert.equal(baseDomain("example.com"), "example.com");
  assert.equal(baseDomain("api.example.com"), "example.com");
  assert.equal(baseDomain("a.example.co.uk"), "co.uk");
  assert.equal(baseDomain("192.168.1.1"), "192.168.1.1");
  assert.equal(baseDomain("localhost"), "localhost");
});

test("categorize classifies the documented content classes", () => {
  const cases: Array<[string, string, string]> = [
    ["https://www.google-analytics.com/collect", "text/plain", "analytics"],
    ["https://example.test/page", "text/html", "page"],
    ["https://example.test/login", "application/json", "auth"],
    ["https://example.test/logo.png", "image/png", "image"],
    ["https://example.test/app.js", "application/javascript", "js"],
    ["https://example.test/app.css", "text/css", "css"],
    ["https://example.test/font.woff2", "font/woff2", "font"],
    ["https://example.test/api/users", "application/json", "api"],
    ["https://example.test/data.csv", "text/csv", "data"],
    ["https://example.test/blob.bin", "application/octet-stream", "other"],
  ];

  for (const [url, mime, expected] of cases) {
    assert.equal(categorize(entry, new URL(url), mime), expected, `${url} (${mime})`);
  }
});
