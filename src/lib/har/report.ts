import type { HarAnalysis } from "./types.ts";

export function buildCsvReport(analysis: HarAnalysis): string {
  const header = [
    "index",
    "method",
    "status",
    "statusText",
    "category",
    "host",
    "path",
    "url",
    "time_ms",
    "size_bytes",
    "is_third_party",
    "issues",
    "mime_type",
  ].join(",");
  const rows = analysis.entries.map((e) =>
    [
      e.index,
      e.method,
      e.status,
      `"${(e.statusText || "").replace(/"/g, '""')}"`,
      e.category,
      e.host,
      `"${e.path.replace(/"/g, '""')}"`,
      `"${e.url.replace(/"/g, '""')}"`,
      e.timeMs,
      e.sizeBytes,
      e.isThirdParty ? 1 : 0,
      `"${e.issues
        .map((i) => `${i.kind}:${i.label}`)
        .join(" | ")
        .replace(/"/g, '""')}"`,
      e.mimeType,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export function buildJsonReport(analysis: HarAnalysis): string {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      creator: analysis.creator,
      firstPartyHost: analysis.firstPartyHost,
      totalRequests: analysis.totalRequests,
      totalSizeBytes: analysis.totalSizeBytes,
      totalTimeMs: analysis.totalTimeMs,
      ttfbMedianMs: analysis.ttfbMedianMs,
      lcpHeuristicMs: analysis.lcpHeuristicMs,
      uniqueHosts: analysis.uniqueHosts,
      errorCount: analysis.errorCount,
      errors4xx: analysis.errors4xx,
      errors5xx: analysis.errors5xx,
      failedCount: analysis.failedCount,
      corsCount: analysis.corsCount,
      authCount: analysis.authCount,
      redirectCount: analysis.redirectCount,
      slowCount: analysis.slowCount,
      largeCount: analysis.largeCount,
      thirdPartyCount: analysis.thirdPartyCount,
      sensitiveRequestCount: analysis.sensitiveRequestCount,
      slowest: analysis.slowest
        ? { url: analysis.slowest.url, timeMs: analysis.slowest.timeMs }
        : null,
      largest: analysis.largest
        ? { url: analysis.largest.url, sizeBytes: analysis.largest.sizeBytes }
        : null,
      lcpHeuristicEntry: analysis.lcpHeuristicEntry
        ? {
            url: analysis.lcpHeuristicEntry.url,
            sizeBytes: analysis.lcpHeuristicEntry.sizeBytes,
          }
        : null,
    },
    categoryCounts: analysis.categoryCounts,
    domains: analysis.domains,
  };
  return JSON.stringify(report, null, 2);
}
