"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { formatBytes, type DomainStat } from "@/lib/har";
import { PaginationBar } from "@/components/har/pagination-bar";

const PAGE_SIZE = 20;

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

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={domains.length}
        pageSize={PAGE_SIZE}
        noun="domains"
        onChange={goToPage}
      />
    </div>
  );
}
