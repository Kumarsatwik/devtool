import assert from "node:assert/strict";
import test from "node:test";
import { analyzeHar, parseHar } from "../../src/lib/har/index.ts";

const har = {
  log: {
    version: "1.2",
    creator: { name: "Test" },
    entries: [
      {
        startedDateTime: "2024-01-01T00:00:00.000Z",
        time: 100,
        request: { method: "GET", url: "https://example.test/" },
        response: {
          status: 200,
          statusText: "OK",
          content: { mimeType: "text/html", size: 1000 },
        },
        timings: { wait: 50 },
      },
      {
        startedDateTime: "2024-01-01T00:00:01.000Z",
        time: 1500,
        request: {
          method: "POST",
          url: "https://api.other.test/data",
          headers: [
            { name: "Origin", value: "https://other.test" },
            { name: "Authorization", value: "Bearer secret" },
          ],
          postData: {
            mimeType: "application/json",
            text: '{"password":"secret"}',
          },
        },
        response: {
          status: 500,
          statusText: "Server Error",
          headers: [],
          content: { mimeType: "application/json", size: 600 * 1024 },
        },
        timings: { wait: 100 },
      },
      {
        startedDateTime: "2024-01-01T00:00:02.000Z",
        time: 50,
        request: { method: "GET", url: "https://cdn.other.test/logo.png" },
        response: {
          status: 304,
          statusText: "Not Modified",
          content: { mimeType: "image/png", size: 100 },
        },
      },
    ],
  },
};

test("summarizes a synthetic archive", () => {
  const analysis = analyzeHar(JSON.stringify(har));

  assert.equal(analysis.firstPartyHost, "example.test");
  assert.equal(analysis.totalRequests, 3);
  assert.equal(analysis.errorCount, 1);
  assert.equal(analysis.errors5xx, 1);
  assert.equal(analysis.slowCount, 1);
  assert.equal(analysis.largeCount, 1);
  assert.equal(analysis.corsCount, 1);
  assert.equal(analysis.authCount, 0);
  assert.equal(analysis.redirectCount, 1);
  assert.equal(analysis.thirdPartyCount, 2);
  assert.equal(analysis.sensitiveRequestCount, 1);
  assert.equal(analysis.uniqueHosts, 3);
  assert.equal(analysis.totalSizeBytes, 1000 + 600 * 1024 + 100);
  assert.equal(analysis.ttfbMedianMs, 75);
  assert.equal(analysis.slowest?.index, 1);
  assert.equal(analysis.largest?.index, 1);
});

test("classifies entries and preserves issue provenance", () => {
  const analysis = analyzeHar(JSON.stringify(har));

  assert.deepEqual(
    analysis.entries.map((entry) => entry.category),
    ["page", "api", "image"],
  );
  assert.deepEqual(analysis.categoryCounts, {
    page: 1,
    api: 1,
    auth: 0,
    image: 1,
    js: 0,
    css: 0,
    font: 0,
    data: 0,
    analytics: 0,
    other: 0,
  });
  assert.deepEqual(
    analysis.domains.map((domain) => domain.host),
    ["example.test", "api.other.test", "cdn.other.test"],
  );
  assert.equal(
    analysis.entries[1]?.issues.some((issue) => issue.kind === "cors"),
    true,
  );
  assert.equal(
    analysis.entries[1]?.issues.some((issue) => issue.kind === "large"),
    true,
  );
});

test("rejects malformed HAR documents", () => {
  assert.throws(() => parseHar("{bad"), /Invalid JSON/);
  assert.throws(() => parseHar('{"log":{}}'), /missing `log.entries` array/);
});
