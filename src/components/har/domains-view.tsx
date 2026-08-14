"use client";

import { useState } from "react";
import { Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { formatBytes, type DomainStat } from "@/lib/har";

const PAGE_SIZE = 20;

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

export function DomainsView({
  domains,
  firstPartyHost,
  onSelectDomain,
}: {
  domains: DomainStat[];
  firstPartyHost: string;
  onSelectDomain: (host: string) => void;
}) {
  const [page, setPage] = useState(1);

  if (domains.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic border border-border rounded-lg bg-card px-4 py-6 text-center">
        No domain information available in this HAR file.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(domains.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visible = domains.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground select-none">
        Domains contacted in this capture. “Third-party” means the domain differs from{" "}
        <span className="font-semibold text-foreground">{firstPartyHost || "the main page"}</span>. Click a
        domain to inspect its requests.
      </p>

      <div className="border border-border rounded-lg bg-card divide-y divide-border overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_110px_110px] items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 select-none">
          <span>Domain</span>
          <span className="text-right">Requests</span>
          <span className="text-right">Data</span>
          <span className="text-right">Type</span>
        </div>
        {visible.map((d) => (
          <button
            key={d.host}
            onClick={() => onSelectDomain(d.host)}
            className="w-full grid grid-cols-[1fr_110px_110px_110px] items-center gap-2 px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-foreground"
          >
            <span className="min-w-0 flex items-center gap-2 font-mono text-xs text-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{d.host}</span>
            </span>
            <span className="text-right font-mono text-xs text-muted-foreground">{d.count}</span>
            <span className="text-right font-mono text-xs text-muted-foreground">
              {formatBytes(d.sizeBytes)}
            </span>
            <span className="text-right">
              {d.thirdParty ? (
                <span className="inline-flex px-2 py-0.5 rounded border border-amber-500/25 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Third-party
                </span>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  First-party
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {domains.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 select-none">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} · {domains.length} domains
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
    </div>
  );
}
