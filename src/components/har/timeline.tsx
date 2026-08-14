"use client";

import { useMemo, useState } from "react";
import { formatMs, type AnalyzedEntry, type HarAnalysis } from "@/lib/har";

type TimelineFilter = "all" | "api" | "page" | "image" | "js" | "css" | "thirdparty";

const TIMELINE_FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "api", label: "API" },
  { key: "page", label: "Documents" },
  { key: "image", label: "Images" },
  { key: "js", label: "JavaScript" },
  { key: "css", label: "CSS" },
  { key: "thirdparty", label: "Third-party" },
];

const MAX_ROWS = 300;

export function TimelineView({
  analysis,
  onSelect,
}: {
  analysis: HarAnalysis;
  onSelect: (entry: AnalyzedEntry) => void;
}) {
  const [filter, setFilter] = useState<TimelineFilter>("all");

  const { rows, minStart, windowMs } = useMemo(() => {
    const timed = analysis.entries.filter((e) => Number.isFinite(e.startMs));
    const min = Math.min(...timed.map((e) => e.startMs));
    const max = Math.max(...timed.map((e) => e.startMs + e.timeMs));
    const win = Math.max(max - min, 1);
    let list = timed;
    if (filter === "thirdparty") list = timed.filter((e) => e.isThirdParty);
    else if (filter !== "all") list = timed.filter((e) => e.category === filter);
    return { rows: list.slice(0, MAX_ROWS), minStart: min, windowMs: win, total: list.length };
  }, [analysis, filter]);

  if (analysis.entries.every((e) => !Number.isFinite(e.startMs))) {
    return (
      <p className="text-xs text-muted-foreground italic border border-border rounded-lg bg-card px-4 py-6 text-center">
        This HAR file does not record request start times, so a timeline can’t be built.
      </p>
    );
  }

  const barColor = (e: AnalyzedEntry) =>
    e.status === 0 || e.status >= 400
      ? "bg-destructive/70"
      : e.timeMs >= 1000
        ? "bg-amber-500/80"
        : "bg-blue-500/70 dark:bg-blue-400/70";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1 shrink-0 select-none" role="tablist" aria-label="Timeline filters">
        {TIMELINE_FILTERS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded border text-sm font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-foreground ${
              filter === tab.key
                ? "bg-secondary text-foreground border-border"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/45"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          Total window: {formatMs(windowMs)}
        </span>
      </div>

      <div className="h-[480px] border border-border rounded-lg bg-card overflow-y-auto">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No requests in this category.</p>
        ) : (
          <div className="divide-y divide-border/60 min-w-[560px]">
            {rows.map((entry) => {
              const left = ((entry.startMs - minStart) / windowMs) * 100;
              const width = Math.max((entry.timeMs / windowMs) * 100, 0.6);
              return (
                <button
                  key={entry.index}
                  onClick={() => onSelect(entry)}
                  className="w-full grid grid-cols-[minmax(140px,240px)_1fr_64px] items-center gap-2 px-3 py-1.5 hover:bg-secondary/40 transition-colors text-left focus:outline-none focus:ring-1 focus:ring-inset focus:ring-foreground"
                  title={`${entry.method} ${entry.url}`}
                >
                  <span className="truncate font-mono text-xs text-foreground">
                    <span className="font-bold">{entry.method}</span>{" "}
                    <span className="text-muted-foreground">{entry.path || entry.host}</span>
                  </span>
                  <span className="relative h-4 bg-muted/40 rounded overflow-hidden" aria-hidden="true">
                    <span
                      className={`absolute top-0 h-full rounded ${barColor(entry)}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs text-muted-foreground">
                    {formatMs(entry.timeMs)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground shrink-0 select-none">
        Click any request to open its details without leaving the timeline. Bars show when each request
        started and how long it took, relative to the whole capture.
        {rows.length >= MAX_ROWS && ` Showing the first ${MAX_ROWS} matching requests.`}
      </p>
    </div>
  );
}
