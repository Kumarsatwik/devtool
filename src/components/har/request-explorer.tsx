"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  CATEGORY_META,
  decodeBody,
  formatBytes,
  formatMs,
  type AnalyzedEntry,
  type HarAnalysis,
  type RequestCategory,
} from "@/lib/har";

export type ExplorerFilter =
  | "all"
  | "error"
  | "slow"
  | "large"
  | "cors"
  | "thirdparty"
  | "sensitive"
  | RequestCategory;

/**
 * Explicit handoff from another view (Overview, Domains) into this explorer.
 * The explorer renders a visible, dismissible chip for this state, so the
 * user always knows why the list is filtered.
 */
export type ExplorerHandoff =
  | { kind: "none" }
  | { kind: "filter"; filter: ExplorerFilter; label: string }
  | { kind: "domain"; host: string };

const FILTER_TABS: { key: ExplorerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "error", label: "Errors" },
  { key: "slow", label: "Slow" },
  { key: "large", label: "Large" },
  { key: "cors", label: "CORS" },
  { key: "sensitive", label: "Sensitive" },
  { key: "api", label: "API" },
  { key: "auth", label: "Authentication" },
  { key: "thirdparty", label: "Third-party" },
  { key: "image", label: "Images" },
  { key: "js", label: "JavaScript" },
  { key: "css", label: "CSS" },
];

const PAGE_SIZE = 50;

/** Page-number buttons with ellipsis compression for large result sets. */
function paginationPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

function matchesFilter(entry: AnalyzedEntry, filter: ExplorerFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "thirdparty":
      return entry.isThirdParty;
    case "sensitive":
      return entry.sensitive.length > 0;
    case "error":
    case "slow":
    case "large":
    case "cors":
      return entry.issues.some((i) => i.kind === filter);
    default:
      return entry.category === filter;
  }
}

/** Lazily-built lowercase search corpus for an entry. */
function buildCorpus(entry: AnalyzedEntry): string {
  const parts: string[] = [
    entry.url,
    entry.method,
    String(entry.status),
    entry.statusText,
    entry.mimeType,
    entry.host,
  ];
  for (const h of entry.raw.request.headers ?? []) parts.push(h.name, h.value);
  for (const h of entry.raw.response.headers ?? []) parts.push(h.name, h.value);
  for (const q of entry.queryParams) parts.push(q.name, q.value);
  for (const c of entry.reqCookies) parts.push(c.name, c.value);
  for (const c of entry.resCookies) parts.push(c.name, c.value);
  const reqBody = decodeBody(
    entry.raw.request.postData?.text,
    undefined,
    entry.raw.request.postData?.mimeType,
  );
  if (reqBody) parts.push(reqBody.slice(0, 100_000));
  const resBody = decodeBody(
    entry.raw.response.content?.text,
    entry.raw.response.content?.encoding,
    entry.raw.response.content?.mimeType,
  );
  if (resBody) parts.push(resBody.slice(0, 100_000));
  return parts.join("\n").toLowerCase();
}

function statusDot(entry: AnalyzedEntry): { cls: string; label: string } {
  if (entry.status === 0 || entry.status >= 400)
    return { cls: "bg-destructive", label: "Error" };
  if (entry.status >= 300) return { cls: "bg-blue-500", label: "Redirect" };
  if (entry.timeMs >= 1000) return { cls: "bg-amber-500", label: "Slow" };
  return { cls: "bg-emerald-500", label: "OK" };
}

function statusLabel(entry: AnalyzedEntry): string {
  if (entry.status === 0) return "Failed";
  return `${entry.status} ${entry.statusText}`.trim();
}

export function RequestExplorer({
  analysis,
  filter = "all",
  onFilterChange,
  handoff = { kind: "none" },
  onClearHandoff,
  onSelect,
}: {
  analysis: HarAnalysis;
  filter?: ExplorerFilter;
  onFilterChange?: (filter: ExplorerFilter) => void;
  handoff?: ExplorerHandoff;
  onClearHandoff?: () => void;
  onSelect: (entry: AnalyzedEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  const domainHost = handoff.kind === "domain" ? handoff.host : null;

  // Search corpus cache, built on demand per entry.
  // NOTE: we intentionally use a stable Map object whose identity persists
  // between renders; we mutate it during the filter pass. This avoids React
  // ref reads during render-phase computations while still preserving
  // per-session cache semantics.
  const [corpusCache] = useState<Map<number, string>>(() => new Map());
  useEffect(() => {
    corpusCache.clear();
  }, [analysis, corpusCache]);

  const methods = useMemo(
    () => [...new Set(analysis.entries.map((e) => e.method))].sort(),
    [analysis],
  );

  const filtered = useMemo(() => {
    let list = analysis.entries.filter((e) => matchesFilter(e, filter));
    if (domainHost) list = list.filter((e) => e.host === domainHost);
    if (methodFilter) list = list.filter((e) => e.method === methodFilter);
    if (statusFilter) {
      list = list.filter((e) => {
        if (statusFilter === "failed") return e.status === 0;
        if (statusFilter === "2xx") return e.status >= 200 && e.status < 300;
        if (statusFilter === "3xx") return e.status >= 300 && e.status < 400;
        if (statusFilter === "4xx") return e.status >= 400 && e.status < 500;
        if (statusFilter === "5xx") return e.status >= 500;
        return true;
      });
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        let corpus = corpusCache.get(e.index);
        if (!corpus) {
          corpus = buildCorpus(e);
          corpusCache.set(e.index, corpus);
        }
        return corpus.includes(q);
      });
    }
    return list;
  }, [analysis, filter, query, methodFilter, statusFilter, corpusCache, domainHost]);

  useEffect(() => {
    setPage(1);
    listRef.current?.scrollTo(0, 0);
  }, [filter, query, methodFilter, statusFilter, domainHost]);

  const filterCount = (key: ExplorerFilter): number =>
    analysis.entries.filter((e) => matchesFilter(e, key)).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next === currentPage) return;
    setPage(next);
    listRef.current?.scrollTo(0, 0);
  };

  const chipLabel =
    domainHost !== null
      ? `Domain: ${domainHost}`
      : handoff.kind === "filter"
        ? handoff.label
        : null;

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 shrink-0 select-none">
        <div
          className="flex flex-wrap items-center gap-1"
          role="tablist"
          aria-label="Request filters"
        >
          {FILTER_TABS.map((tab) => {
            const count = filterCount(tab.key);
            if (tab.key !== "all" && count === 0) return null;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => onFilterChange?.(tab.key)}
                className={`px-3 py-1.5 rounded border text-sm font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-foreground dark:focus:ring-zinc-300 ${
                  active
                    ? "bg-secondary text-foreground border-border dark:bg-zinc-700 dark:text-white dark:border-zinc-500"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/45 dark:text-zinc-400 dark:border-zinc-700/50 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100 dark:hover:border-zinc-600"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs font-bold text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search
              className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search URLs, headers, payloads, responses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search requests"
              className="text-sm bg-background border border-border rounded pl-9 pr-3 py-2 w-72 max-w-full focus:outline-none focus:ring-1 focus:ring-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            className={`flex items-center gap-1.5 px-3 py-2 rounded border text-sm font-semibold transition-colors ${
              advancedOpen
                ? "bg-secondary text-foreground border-border dark:bg-zinc-700 dark:text-white dark:border-zinc-500"
                : "text-muted-foreground border-border hover:text-foreground dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Advanced
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      {advancedOpen && (
        <div className="flex flex-wrap items-center gap-3 shrink-0 border border-border rounded bg-card px-3 py-2.5 text-xs select-none">
          <label className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            Method
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="">Any</option>
              {methods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="">Any</option>
              <option value="2xx">2xx Success</option>
              <option value="3xx">3xx Redirect</option>
              <option value="4xx">4xx Client error</option>
              <option value="5xx">5xx Server error</option>
              <option value="failed">Failed / blocked</option>
            </select>
          </label>
          {(methodFilter || statusFilter) && (
            <button
              onClick={() => {
                setMethodFilter("");
                setStatusFilter("");
              }}
              className="text-muted-foreground hover:text-foreground font-semibold"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Active handoff chip — why is this list filtered? */}
      {chipLabel && (
        <div className="flex items-center gap-2 shrink-0 select-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-500/30 bg-blue-500/10 text-xs font-bold text-blue-700 dark:text-blue-300">
            {chipLabel}
            <span className="text-muted-foreground font-semibold">
              {filtered.length}
            </span>
            <button
              onClick={onClearHandoff}
              aria-label={`Clear ${chipLabel} filter`}
              title="Clear this filter"
              className="ml-0.5 -mr-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-foreground rounded p-0.5"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
          <span className="text-xs text-muted-foreground">
            Filtered by {domainHost !== null ? "the Domains view" : "the Overview"}
          </span>
        </div>
      )}

      {/* Request list */}
      <div
        ref={listRef}
        className="flex-1 min-h-0 border border-border rounded-lg bg-card overflow-y-auto"
        role="list"
        aria-label="Requests"
      >
        {visible.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-12 select-none">
            <Search
              className="h-8 w-8 text-muted-foreground/45"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">
              No requests match the current filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((entry) => {
              const dot = statusDot(entry);
              return (
                <button
                  key={entry.index}
                  role="listitem"
                  onClick={() => onSelect(entry)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/40 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-foreground"
                >
                  <span
                    className={`shrink-0 h-2 w-2 rounded-full ${dot.cls}`}
                    role="img"
                    aria-label={dot.label}
                    title={dot.label}
                  />
                  <span className="w-14 shrink-0 font-bold font-mono text-xs text-foreground">
                    {entry.method}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate font-mono text-xs text-foreground"
                      title={entry.url}
                    >
                      {entry.host}
                      <span className="text-muted-foreground">
                        {entry.path}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {CATEGORY_META[entry.category].label}
                      {entry.isThirdParty && " · Third-party"}
                      {entry.sensitive.length > 0 && " · 🔐 sensitive data"}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-mono text-xs text-right ${
                      entry.status === 0 || entry.status >= 400
                        ? "text-destructive font-bold"
                        : entry.status >= 300
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {statusLabel(entry)}
                  </span>
                  <span
                    className={`w-16 shrink-0 text-right font-mono text-xs ${
                      entry.timeMs >= 1000
                        ? "text-amber-600 dark:text-amber-400 font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatMs(entry.timeMs)}
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {formatBytes(entry.sizeBytes)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 shrink-0 select-none">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} · {filtered.length} requests
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="flex items-center gap-1 px-2 py-1.5 rounded border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Prev
            </button>
            {paginationPages(currentPage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1.5 text-xs text-muted-foreground select-none">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  aria-current={p === currentPage ? "page" : undefined}
                  aria-label={`Page ${p}`}
                  className={`min-w-8 h-8 px-2 rounded border text-xs font-bold transition-colors focus:outline-none focus:ring-1 focus:ring-foreground ${
                    p === currentPage
                      ? "bg-secondary text-foreground border-border dark:bg-zinc-700 dark:text-white dark:border-zinc-500"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/45 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              className="flex items-center gap-1 px-2 py-1.5 rounded border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground shrink-0 select-none">
        {filtered.length} of {analysis.totalRequests} requests
        {query && ` matching “${query}”`}
      </p>
    </div>
  );
}
