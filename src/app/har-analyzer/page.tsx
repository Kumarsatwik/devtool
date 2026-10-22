"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/tool-page-layout";
import { PrivacyBadge } from "@/components/har/privacy-badge";
import { EmptyState } from "@/components/har/empty-state";
import { OverviewDashboard } from "@/components/har/overview";
import {
  RequestExplorer,
  type ExplorerFilter,
  type ExplorerHandoff,
} from "@/components/har/request-explorer";
import { RequestDrawer } from "@/components/har/request-drawer";
import { TimelineView } from "@/components/har/timeline";
import { DomainsView } from "@/components/har/domains-view";
import {
  analyzeHar,
  formatBytes,
  formatMs,
  type AnalyzedEntry,
  type HarAnalysis,
} from "@/lib/har";
import { SAMPLE_HAR } from "@/lib/har/sample";
import { buildCsvReport, buildJsonReport } from "@/lib/har/report";
import { downloadBlob } from "@/lib/download";
import { FileJson, RefreshCw, Table } from "lucide-react";

type MainTab = "overview" | "timeline" | "requests" | "domains";

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "requests", label: "Requests" },
  { key: "domains", label: "Domains" },
];

const FILTER_LABELS: Record<ExplorerFilter, string> = {
  all: "All requests",
  error: "Errors",
  slow: "Slow requests",
  large: "Large responses",
  cors: "CORS issues",
  thirdparty: "Third-party requests",
  sensitive: "Sensitive data",
  page: "Documents",
  api: "API requests",
  auth: "Authentication",
  image: "Images",
  js: "JavaScript",
  css: "CSS",
  font: "Fonts",
  data: "Data",
  analytics: "Analytics",
  other: "Other",
};


export default function HarAnalyzerPage() {
  const [analysis, setAnalysis] = useState<HarAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<MainTab>("overview");
  const [explorerFilter, setExplorerFilter] =
    useState<ExplorerFilter>("all");
  const [handoff, setHandoff] = useState<ExplorerHandoff>({ kind: "none" });
  const [drawerEntry, setDrawerEntry] = useState<AnalyzedEntry | null>(null);

  const handleLoaded = (content: string) => {
    try {
      setAnalysis(analyzeHar(content));
      setError(null);
      setTab("overview");
      setExplorerFilter("all");
      setHandoff({ kind: "none" });
      setDrawerEntry(null);
    } catch (err) {
      setAnalysis(null);
      setError(
        err instanceof Error ? err.message : "Failed to analyze HAR file",
      );
    }
  };

  const handleClear = () => {
    setAnalysis(null);
    setError(null);
    setTab("overview");
    setExplorerFilter("all");
    setHandoff({ kind: "none" });
    setDrawerEntry(null);
  };

  const handleInvestigate = (filter: ExplorerFilter) => {
    setExplorerFilter(filter);
    setHandoff({ kind: "filter", filter, label: FILTER_LABELS[filter] });
    setDrawerEntry(null);
    setTab("requests");
  };

  const handleDomainClick = (host: string) => {
    setExplorerFilter("all");
    setHandoff({ kind: "domain", host });
    setDrawerEntry(null);
    setTab("requests");
  };

  const handleClearHandoff = () => {
    setExplorerFilter("all");
    setHandoff({ kind: "none" });
  };

  const handleExportCsv = () => {
    if (!analysis) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadBlob(
      `har-report-${stamp}.csv`,
      buildCsvReport(analysis),
      "text/csv;charset=utf-8",
    );
  };

  const handleExportJson = () => {
    if (!analysis) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadBlob(
      `har-report-${stamp}.json`,
      buildJsonReport(analysis),
      "application/json",
    );
  };

  const summaryBadge = useMemo(() => {
    if (!analysis) return null;
    return (
      <span className="hidden sm:inline-flex items-center gap-2 text-sm text-muted-foreground">
        <span>{analysis.totalRequests} requests</span>
        <span className="text-border/60">·</span>
        <span>{formatBytes(analysis.totalSizeBytes)}</span>
        <span className="text-border/60">·</span>
        <span>{formatMs(analysis.totalTimeMs)}</span>
      </span>
    );
  }, [analysis]);

  /* ---------- Empty state ---------- */
  if (!analysis) {
    return (
      <ToolPageLayout
        title="HAR Analyzer"
        description="Analyze HTTP Archive (.har) files for performance bottlenecks, HTTP errors, CORS misconfigurations, and auth issues."
      >
        <EmptyState
          onFileLoaded={handleLoaded}
          onLoadSample={() => handleLoaded(SAMPLE_HAR)}
          error={error}
        />
      </ToolPageLayout>
    );
  }

  /* ---------- Results layout ---------- */
  return (
    <ToolPageLayout
      title="HAR Analyzer"
      description="Analyze HTTP Archive (.har) files for performance bottlenecks, HTTP errors, CORS misconfigurations, and auth issues."
    >
      <div className="h-full flex flex-col min-h-0 gap-3">
        {/* Toolbar: tabs + actions + summary */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 select-none">
          <div
            className="flex items-center gap-1"
            role="tablist"
            aria-label="Analysis views"
          >
            {MAIN_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded border text-sm font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-foreground dark:focus:ring-zinc-300 ${
                    active
                      ? "bg-secondary text-foreground border-border dark:bg-zinc-700 dark:text-white dark:border-zinc-500"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/45 dark:text-zinc-400 dark:border-zinc-700/50 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100 dark:hover:border-zinc-600"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {summaryBadge}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <PrivacyBadge />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="font-semibold rounded shadow-sm"
            >
              <Table className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="font-semibold rounded shadow-sm"
            >
              <FileJson className="h-4 w-4 mr-1.5" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="font-semibold rounded shadow-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              New File
            </Button>
          </div>
        </div>

        {/* Tab content area */}
        <div className="flex-1 min-h-0">
          {tab === "overview" && (
            <div className="h-full overflow-y-auto pr-1">
              <OverviewDashboard
                analysis={analysis}
                onInvestigate={handleInvestigate}
                onOpenEntry={setDrawerEntry}
              />
            </div>
          )}

          {tab === "timeline" && (
            <TimelineView
              analysis={analysis}
              onSelect={setDrawerEntry}
            />
          )}

          {tab === "requests" && (
            <RequestExplorer
              analysis={analysis}
              filter={explorerFilter}
              onFilterChange={setExplorerFilter}
              handoff={handoff}
              onClearHandoff={handleClearHandoff}
              onSelect={setDrawerEntry}
            />
          )}

          {tab === "domains" && (
            <div className="h-full overflow-y-auto pr-1">
              <DomainsView
                domains={analysis.domains}
                firstPartyHost={analysis.firstPartyHost}
                onSelectDomain={handleDomainClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Slide-over request details — opens on top of any view */}
      {drawerEntry && (
        <RequestDrawer
          entry={drawerEntry}
          onClose={() => setDrawerEntry(null)}
        />
      )}
    </ToolPageLayout>
  );
}
