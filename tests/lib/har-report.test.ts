import assert from "node:assert/strict";
import test from "node:test";
import { buildCsvReport, buildJsonReport } from "../../src/lib/har/report.ts";
import type { HarAnalysis } from "../../src/lib/har/types.ts";

const analysis: HarAnalysis = {
  entries: [
    {
      index: 0,
      method: "GET",
      url: 'https://example.test/a"b',
      host: "example.test",
      path: '/a"b',
      status: 200,
      statusText: "OK",
      mimeType: "text/html",
      category: "page",
      isThirdParty: false,
      timeMs: 10,
      sizeBytes: 100,
      startedDateTime: "2024-01-01T00:00:00.000Z",
      startMs: 0,
      issues: [{ kind: "error", label: 'X "Y"', detail: "detail" }],
      sensitive: [],
      queryParams: [],
      reqCookies: [],
      resCookies: [],
      raw: {
        request: { method: "GET", url: 'https://example.test/a"b' },
        response: { status: 200 },
      },
    },
  ],
  creator: "Test",
  firstPartyHost: "example.test",
  totalRequests: 1,
  totalSizeBytes: 100,
  totalTimeMs: 10,
  errorCount: 1,
  errors4xx: 0,
  errors5xx: 0,
  failedCount: 0,
  corsCount: 0,
  authCount: 0,
  redirectCount: 0,
  slowCount: 0,
  largeCount: 0,
  thirdPartyCount: 0,
  sensitiveRequestCount: 0,
  uniqueHosts: 1,
  categoryCounts: {
    page: 1,
    api: 0,
    auth: 0,
    image: 0,
    js: 0,
    css: 0,
    font: 0,
    data: 0,
    analytics: 0,
    other: 0,
  },
  domains: [],
  slowest: null,
  largest: null,
  ttfbMedianMs: null,
  lcpHeuristicMs: null,
  lcpHeuristicEntry: null,
};

test("CSV reports preserve the current header and quoting", () => {
  assert.equal(
    buildCsvReport(analysis),
    [
      "index,method,status,statusText,category,host,path,url,time_ms,size_bytes,is_third_party,issues,mime_type",
      '0,GET,200,"OK",page,example.test,"/a""b","https://example.test/a""b",10,100,0,"error:X ""Y""",text/html',
    ].join("\n"),
  );
});

test("JSON reports keep the summary and category shape", () => {
  const report = JSON.parse(buildJsonReport(analysis)) as {
    generatedAt: string;
    summary: { creator: string; totalRequests: number };
    categoryCounts: Record<string, number>;
    domains: unknown[];
  };

  assert.equal(typeof report.generatedAt, "string");
  assert.equal(report.summary.creator, "Test");
  assert.equal(report.summary.totalRequests, 1);
  assert.equal(report.categoryCounts.page, 1);
  assert.deepEqual(report.domains, []);
});
