import assert from "node:assert/strict";
import test from "node:test";
import { explainEntry, TIMING_PHASES } from "../../src/lib/har/insights.ts";
import type { AnalyzedEntry } from "../../src/lib/har/types.ts";

function makeEntry(overrides: Partial<AnalyzedEntry> = {}): AnalyzedEntry {
  return {
    index: 0,
    method: "GET",
    url: "https://example.test/",
    host: "example.test",
    path: "/",
    status: 200,
    statusText: "OK",
    mimeType: "text/html",
    category: "page",
    isThirdParty: false,
    timeMs: 0,
    sizeBytes: 0,
    startedDateTime: "",
    startMs: 0,
    issues: [],
    sensitive: [],
    queryParams: [],
    reqCookies: [],
    resCookies: [],
    raw: {
      request: { method: "GET", url: "https://example.test/" },
      response: { status: 200 },
    },
    ...overrides,
  };
}

test("explains the common status classes", () => {
  assert.match(explainEntry(makeEntry()) ?? "", /succeeded/);
  assert.match(explainEntry(makeEntry({ status: 0 })) ?? "", /never completed/);
  assert.match(explainEntry(makeEntry({ status: 404, statusText: "Not Found" })) ?? "", /could not find/);
  assert.match(explainEntry(makeEntry({ status: 500 })) ?? "", /server encountered an error/i);
  assert.match(explainEntry(makeEntry({ status: 599 })) ?? "", /server failed/i);
});

test("includes redirect destinations for 3xx codes without a fixed explanation", () => {
  const entry = makeEntry({
    status: 307,
    statusText: "Temporary Redirect",
    raw: {
      request: { method: "GET", url: "https://example.test/" },
      response: { status: 307, redirectURL: "https://example.test/new" },
    },
  });

  assert.match(explainEntry(entry) ?? "", /redirect to https:\/\/example\.test\/new/);
  assert.equal(
    explainEntry(makeEntry({ status: 302, statusText: "Found" })),
    "The resource was found at a different (temporary) address.",
  );
});

test("exposes the timing phases in display order", () => {
  assert.deepEqual(
    TIMING_PHASES.map((phase) => phase.key),
    ["blocked", "dns", "connect", "ssl", "send", "wait", "receive"],
  );
});
