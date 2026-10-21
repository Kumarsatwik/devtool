/* HAR (HTTP Archive) parsing and analysis helpers.
   All processing is client-side; nothing leaves the browser. */

import type {
  AnalyzedEntry,
  DomainStat,
  EntryIssue,
  HarAnalysis,
  HarEntry,
  HarLog,
  HarNameValue,
  IssueKind,
  RequestCategory,
} from "./har/types.ts";

export type {
  AnalyzedEntry,
  DomainStat,
  EntryIssue,
  HarAnalysis,
  HarCookie,
  HarEntry,
  HarLog,
  HarNameValue,
  IssueKind,
  RequestCategory,
  SensitiveFinding,
} from "./har/types.ts";

import { CATEGORY_META, baseDomain, categorize } from "./har/classify.ts";
import { detectSensitive } from "./har/sensitive.ts";

export { CATEGORY_META, baseDomain };
export {
  SENSITIVE_HEADER,
  SENSITIVE_KEY,
  maskValue,
  isSensitiveHeader,
} from "./har/sensitive.ts";

/* ---------------- issues ---------------- */

const SLOW_THRESHOLD_MS = 1000;
const LARGE_THRESHOLD_BYTES = 512 * 1024; // 512 KB

export function headerValue(
  headers: HarNameValue[] | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  return headers.find((h) => h.name.toLowerCase() === lower)?.value;
}

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/* ---------------- analyzed model ---------------- */

function analyzeEntry(
  entry: HarEntry,
  index: number,
  firstPartyHost: string,
): AnalyzedEntry {
  const url = entry.request.url ?? "";
  const parsed = safeUrl(url);
  const status = entry.response.status ?? 0;
  const timeMs = typeof entry.time === "number" ? entry.time : 0;
  const sizeBytes =
    entry.response._transferSize && entry.response._transferSize > 0
      ? entry.response._transferSize
      : entry.response.content?.size && entry.response.content.size > 0
        ? entry.response.content.size
        : Math.max(entry.response.bodySize ?? 0, 0);
  const mime = entry.response.content?.mimeType?.split(";")[0] ?? "";
  const host = parsed?.hostname ?? "—";
  const category = categorize(entry, parsed, mime);
  const isThirdParty =
    !!parsed &&
    !!firstPartyHost &&
    baseDomain(host) !== baseDomain(firstPartyHost);

  const issues: EntryIssue[] = [];

  if (status >= 500) {
    issues.push({
      kind: "error",
      label: `${status} Server Error`,
      detail:
        entry.response.statusText ||
        "The server failed to fulfill the request.",
    });
  } else if (status >= 400) {
    issues.push({
      kind: "error",
      label: `${status} Client Error`,
      detail:
        entry.response.statusText || "The request was rejected by the server.",
    });
  } else if (status === 0) {
    issues.push({
      kind: "error",
      label: "Failed Request",
      detail:
        "No HTTP status recorded — the request may have been blocked or aborted.",
    });
  }

  if (status === 401 || status === 403) {
    issues.push({
      kind: "auth",
      label: status === 401 ? "Unauthorized (401)" : "Forbidden (403)",
      detail:
        status === 401
          ? "Authentication is missing or invalid for this request."
          : "The server understood the request but refuses to authorize it.",
    });
  }
  if (headerValue(entry.request.headers, "authorization") && status === 401) {
    issues.push({
      kind: "auth",
      label: "Credentials Rejected",
      detail:
        "Credentials were sent with this request but the server still returned 401.",
    });
  }

  const origin = headerValue(entry.request.headers, "origin");
  if (origin && parsed) {
    const acao = headerValue(
      entry.response.headers,
      "access-control-allow-origin",
    );
    const o = safeUrl(origin);
    const crossOrigin = o ? o.host !== parsed.host : true;
    if (crossOrigin && !acao && status !== 0) {
      issues.push({
        kind: "cors",
        label: "Missing CORS Headers",
        detail: `Cross-origin request from ${origin} has no Access-Control-Allow-Origin response header.`,
      });
    }
    if (crossOrigin && status === 0) {
      issues.push({
        kind: "cors",
        label: "Possible CORS Block",
        detail: `Cross-origin request from ${origin} failed — consistent with a CORS preflight rejection.`,
      });
    }
  }

  if (status >= 300 && status < 400) {
    issues.push({
      kind: "redirect",
      label: `${status} Redirect`,
      detail: entry.response.redirectURL
        ? `Redirects to ${entry.response.redirectURL}`
        : "This request resulted in a redirect.",
    });
  }

  if (timeMs >= SLOW_THRESHOLD_MS) {
    issues.push({
      kind: "slow",
      label: "Slow Request",
      detail: `Took ${(timeMs / 1000).toFixed(2)}s (threshold: ${SLOW_THRESHOLD_MS / 1000}s).`,
    });
  }
  if (sizeBytes >= LARGE_THRESHOLD_BYTES) {
    issues.push({
      kind: "large",
      label: "Large Response",
      detail: `Response body is ${formatBytes(sizeBytes)}.`,
    });
  }

  return {
    index,
    method: (entry.request.method || "GET").toUpperCase(),
    url,
    host,
    path: parsed ? parsed.pathname + parsed.search : url,
    status,
    statusText: entry.response.statusText ?? "",
    mimeType: mime || "—",
    category,
    isThirdParty,
    timeMs,
    sizeBytes,
    startedDateTime: entry.startedDateTime ?? "",
    startMs: entry.startedDateTime ? Date.parse(entry.startedDateTime) : NaN,
    issues,
    sensitive: detectSensitive(entry),
    queryParams: entry.request.queryString?.length
      ? entry.request.queryString
      : parsed
        ? Array.from(parsed.searchParams.entries()).map(([name, value]) => ({
            name,
            value,
          }))
        : [],
    reqCookies: entry.request.cookies ?? [],
    resCookies: entry.response.cookies ?? [],
    raw: entry,
  };
}

/* ---------------- parsing ---------------- */

export function parseHar(content: string): HarLog {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const log = (data as HarLog)?.log;
  if (!log || !Array.isArray(log.entries)) {
    throw new Error("Not a valid HAR file — missing `log.entries` array.");
  }
  return data as HarLog;
}

export function analyzeHar(content: string): HarAnalysis {
  const har = parseHar(content);
  const log = har.log!;
  const rawEntries = log.entries ?? [];

  // First party = host of the first HTML document; fall back to most common host
  let firstPartyHost = "";
  const docEntry = rawEntries.find((e) =>
    (e.response?.content?.mimeType ?? "").toLowerCase().includes("html"),
  );
  if (docEntry) {
    firstPartyHost = safeUrl(docEntry.request.url)?.hostname ?? "";
  }
  if (!firstPartyHost && rawEntries.length > 0) {
    const counts = new Map<string, number>();
    for (const e of rawEntries) {
      const h = safeUrl(e.request?.url ?? "")?.hostname;
      if (h) counts.set(h, (counts.get(h) ?? 0) + 1);
    }
    firstPartyHost =
      [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }

  const entries = rawEntries.map((e, i) => analyzeEntry(e, i, firstPartyHost));

  const hosts = new Set(entries.map((e) => e.host).filter((h) => h !== "—"));
  const count = (kind: IssueKind) =>
    entries.reduce(
      (acc, e) => acc + (e.issues.some((i) => i.kind === kind) ? 1 : 0),
      0,
    );

  const categoryCounts = Object.fromEntries(
    Object.keys(CATEGORY_META).map((k) => [k, 0]),
  ) as Record<RequestCategory, number>;
  for (const e of entries) categoryCounts[e.category]++;

  const domainMap = new Map<string, DomainStat>();
  for (const e of entries) {
    if (e.host === "—") continue;
    const d = domainMap.get(e.host) ?? {
      host: e.host,
      count: 0,
      sizeBytes: 0,
      thirdParty: e.isThirdParty,
    };
    d.count++;
    d.sizeBytes += e.sizeBytes;
    domainMap.set(e.host, d);
  }
  const domains = [...domainMap.values()].sort((a, b) => b.count - a.count);

  // Wall-clock window across all entries when timestamps are present
  let windowMs = 0;
  const starts = entries
    .map((e) => e.startMs)
    .filter((t) => Number.isFinite(t));
  if (starts.length > 0) {
    const min = Math.min(...starts);
    const max = Math.max(
      ...entries.map((e) =>
        Number.isFinite(e.startMs) ? e.startMs + e.timeMs : min,
      ),
    );
    windowMs = Math.max(max - min, 0);
  }

  const withTime = entries.filter((e) => e.timeMs > 0);
  const withSize = entries.filter((e) => e.sizeBytes > 0);

  // TTFB (per-entry wait timing, when HAR records per-phase timings)
  const ttfbs: number[] = [];
  for (const e of entries) {
    const w = e.raw.timings?.wait;
    if (typeof w === "number" && w >= 0) ttfbs.push(w);
  }
  ttfbs.sort((a, b) => a - b);
  const ttfbMedianMs =
    ttfbs.length === 0
      ? null
      : ttfbs.length % 2 === 1
        ? ttfbs[Math.floor(ttfbs.length / 2)]
        : (ttfbs[ttfbs.length / 2 - 1] + ttfbs[ttfbs.length / 2]) / 2;

  // LCP heuristic (since raw `_lcp` is browser-specific): the heaviest image/js/font/document
  // whose wall-clock end time is a candidate for the visual largest-contentful paint.
  // Strategy: among "visible-content" categories (page/image/js/css/font) pick the largest-size
  // entry AND among those report the latest wall-clock end (startMs + timeMs) relative to T=0.
  let lcpEntry: AnalyzedEntry | null = null;
  let lcpWeight = -1; // size bytes primary
  const LCP_CATEGORIES = new Set<RequestCategory>([
    "page",
    "image",
    "js",
    "css",
    "font",
  ]);
  for (const e of entries) {
    if (!LCP_CATEGORIES.has(e.category)) continue;
    if (e.status === 0) continue;
    const size = e.sizeBytes;
    const finish = Number.isFinite(e.startMs) ? e.startMs + e.timeMs : e.timeMs;
    // size-primary then finish-late primary; this approximates: the biggest file that loaded last
    const weight = size * 1 + Math.max(0, finish) * 0.001;
    if (weight > lcpWeight) {
      lcpWeight = weight;
      lcpEntry = e;
    }
  }
  const lcpHeuristicMs = lcpEntry
    ? Number.isFinite(lcpEntry.startMs)
      ? lcpEntry.startMs +
        lcpEntry.timeMs -
        (starts.length ? Math.min(...starts) : 0)
      : lcpEntry.timeMs
    : null;
  const lcpHeuristicEntry = lcpEntry;

  return {
    entries,
    creator: log.creator?.name ?? "Unknown source",
    firstPartyHost,
    totalRequests: entries.length,
    totalSizeBytes: entries.reduce((acc, e) => acc + e.sizeBytes, 0),
    totalTimeMs: windowMs || entries.reduce((acc, e) => acc + e.timeMs, 0),
    errorCount: count("error"),
    errors4xx: entries.filter((e) => e.status >= 400 && e.status < 500).length,
    errors5xx: entries.filter((e) => e.status >= 500).length,
    failedCount: entries.filter((e) => e.status === 0).length,
    corsCount: count("cors"),
    authCount: count("auth"),
    redirectCount: count("redirect"),
    slowCount: count("slow"),
    largeCount: count("large"),
    thirdPartyCount: entries.filter((e) => e.isThirdParty).length,
    sensitiveRequestCount: entries.filter((e) => e.sensitive.length > 0).length,
    uniqueHosts: hosts.size,
    categoryCounts,
    domains,
    slowest: withTime.length
      ? withTime.reduce((a, b) => (b.timeMs > a.timeMs ? b : a))
      : null,
    largest: withSize.length
      ? withSize.reduce((a, b) => (b.sizeBytes > a.sizeBytes ? b : a))
      : null,
    ttfbMedianMs,
    lcpHeuristicMs,
    lcpHeuristicEntry,
  };
}

/* ---------------- plain-English explanations ---------------- */

const STATUS_EXPLANATIONS: Record<number, string> = {
  200: "The request succeeded and the server returned the requested content.",
  201: "The request succeeded and the server created a new resource.",
  204: "The request succeeded; the server has no content to send back.",
  301: "The resource has permanently moved to a new address.",
  302: "The resource was found at a different (temporary) address.",
  304: "The cached copy is still valid, so no data was downloaded again.",
  400: "The server could not understand the request — it may be malformed.",
  401: "The server did not accept the authentication information for this request.",
  403: "The server understood the request but refuses to authorize it.",
  404: "The server could not find the requested resource.",
  408: "The server timed out waiting for the request.",
  409: "The request conflicts with the current state of the server.",
  422: "The request was well-formed but contained invalid data.",
  429: "Too many requests — the server is rate-limiting this client.",
  500: "The server encountered an error while processing the request.",
  502: "A gateway or proxy received an invalid response from the upstream server.",
  503: "The server is temporarily unavailable — it may be overloaded or down for maintenance.",
  504: "A gateway or proxy timed out waiting for the upstream server.",
};

/** Plain-English explanation of what happened, when reliably derivable. */
export function explainEntry(entry: AnalyzedEntry): string | null {
  const { status, statusText, category } = entry;
  const catLabel = CATEGORY_META[category].label.toLowerCase();
  if (status === 0) {
    return "This request never completed. It may have been blocked (for example by a CORS policy or an ad blocker), aborted, or failed before the server responded.";
  }
  const base = STATUS_EXPLANATIONS[status];
  if (base) {
    if (status >= 400) {
      return `The browser sent a ${catLabel} request, but the server rejected it with ${status} ${statusText || ""}. ${base}`.trim();
    }
    return base;
  }
  if (status >= 200 && status < 300)
    return "The request completed successfully.";
  if (status >= 300 && status < 400)
    return `The server responded with a redirect${entry.raw.response.redirectURL ? ` to ${entry.raw.response.redirectURL}` : ""}.`;
  if (status >= 500) return "The server failed while handling this request.";
  return null;
}

export const TIMING_PHASES: {
  key: keyof NonNullable<HarEntry["timings"]>;
  label: string;
  explain: string;
}[] = [
  {
    key: "blocked",
    label: "Blocked",
    explain: "Queued in the browser before the request could start.",
  },
  { key: "dns", label: "DNS", explain: "Looking up the server's IP address." },
  {
    key: "connect",
    label: "Connect",
    explain: "Opening a TCP connection to the server.",
  },
  {
    key: "ssl",
    label: "TLS",
    explain: "Negotiating the encrypted HTTPS connection.",
  },
  { key: "send", label: "Send", explain: "Sending the request to the server." },
  {
    key: "wait",
    label: "Waiting (TTFB)",
    explain: "Time spent waiting for the server to begin responding.",
  },
  {
    key: "receive",
    label: "Receive",
    explain: "Downloading the response content.",
  },
];

/* ---------------- formatting & body helpers ---------------- */

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

/** Max body length rendered in the UI before truncation. */
export const BODY_PREVIEW_LIMIT = 20000;

/**
 * Decode a HAR body (`content.text` / `postData.text`) into a printable string.
 * Handles base64-encoded content; returns null when the body is absent or binary.
 */
export function decodeBody(
  text: string | undefined,
  encoding: string | undefined,
  mimeType: string | undefined,
): string | null {
  if (!text) return null;
  if (encoding === "base64") {
    const mime = (mimeType ?? "").toLowerCase();
    const textual =
      mime.includes("json") ||
      mime.includes("text") ||
      mime.includes("xml") ||
      mime.includes("javascript") ||
      mime.includes("urlencoded") ||
      mime.includes("html") ||
      mime.includes("svg");
    if (!textual) return null;
    try {
      const bin = atob(text);
      return decodeURIComponent(
        Array.from(
          bin,
          (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"),
        ).join(""),
      );
    } catch {
      return null;
    }
  }
  return text;
}

/** True when the body exists but is binary (base64, non-textual). */
export function isBinaryBody(
  encoding: string | undefined,
  mimeType: string | undefined,
  text?: string,
): boolean {
  if (!text || encoding !== "base64") return false;
  return decodeBody(text, encoding, mimeType) === null;
}

/** Pretty-print a body when it parses as JSON; otherwise return it as-is. */
export function prettyBody(body: string, mimeType: string | undefined): string {
  const looksJson =
    (mimeType ?? "").toLowerCase().includes("json") ||
    /^[{[]/.test(body.trim());
  if (!looksJson) return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

/** Build a POSIX shell curl command that approximates the recorded request. */
export function buildCurl(entry: HarEntry): string {
  const method = (entry.request.method || "GET").toUpperCase();
  if (!/^[A-Z][A-Z-]*$/.test(method)) {
    return "# Unsupported HTTP method — cURL command not generated";
  }

  const url = entry.request.url;
  const headers = entry.request.headers ?? [];
  const postData = entry.request.postData;

  const parts: string[] = ["curl"];
  if (method !== "GET") parts.push("-X", shellQuote(method));
  parts.push("--url", shellQuote(url));

  for (const h of headers) {
    const name = h.name;
    const value = h.value;
    if (/^cookie$/i.test(name)) continue;
    parts.push("-H", shellQuote(`${name}: ${value}`));
  }

  if (postData?.text) {
    parts.push("-d", shellQuote(postData.text));
  } else if (postData?.params?.length) {
    const body = postData.params
      .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`)
      .join("&");
    parts.push("-d", shellQuote(body));
  }

  return parts.join(" ");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
