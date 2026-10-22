"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { paginationPages } from "@/lib/pagination";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  noun: string;
  onChange: (page: number) => void;
  className?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  noun,
  onChange,
  className = "",
}: PaginationBarProps) {
  if (totalItems <= pageSize) return null;

  return (
    <div className={`flex items-center justify-between gap-3 select-none ${className}`}>
      <span className="text-xs text-muted-foreground">
        Page {currentPage} of {totalPages} · {totalItems} {noun}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(currentPage - 1)}
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
              onClick={() => onChange(p)}
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
          onClick={() => onChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
