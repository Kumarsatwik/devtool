"use client";

import {
  AlertCircle,
  ArrowRight,
  Clock,
  Database,
  FileWarning,
  Globe,
  Network,
  Snail,
  Package,
} from "lucide-react";
import {
  CATEGORY_META,
  formatBytes,
  formatMs,
  type AnalyzedEntry,
  type HarAnalysis,
  type RequestCategory,
} from "@/lib/har";
import type { ExplorerFilter } from "@/components/har/request-explorer";

interface Finding {
  icon: React.ReactNode;
  tone: "danger" | "warn" | "info";
  title: string;
  detail: string;
  cta: string;
  filter: ExplorerFilter;
}

function OverviewCard({
  label,
  value,
  icon,
  children,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  tone?: "danger";
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${tone === "danger" && value !== "0" ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
      {children && <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>}
    </>
  );

  if (!onClick) {
    return <div className="border border-border bg-card rounded-lg px-4 py-3.5 space-y-1.5">{content}</div>;
  }

  return (
    <button
      onClick={onClick}
      className="border border-border bg-card rounded-lg px-4 py-3.5 space-y-1.5 text-left hover:bg-secondary/40 transition-colors focus:outline-none focus:ring-1 focus:ring-foreground group/card"
    >
      {content}
    </button>
  );
}

export function OverviewDashboard({
  analysis,
  onInvestigate,
  onOpenEntry,
}: {
  analysis: HarAnalysis;
  onInvestigate: (filter: ExplorerFilter) => void;
  onOpenEntry: (entry: AnalyzedEntry) => void;
}) {
  const categoryBreakdown = (Object.keys(CATEGORY_META) as RequestCategory[])
    .filter((c) => analysis.categoryCounts[c] > 0)
    .sort((a, b) => analysis.categoryCounts[b] - analysis.categoryCounts[a]);

  const findings: Finding[] = [];

  if (analysis.errorCount > 0) {
    findings.push({
      icon: <FileWarning className="h-4 w-4" aria-hidden="true" />,
      tone: "danger",
      title: "Failed requests",
      detail: `${analysis.errorCount} request${analysis.errorCount === 1 ? "" : "s"} returned an error${analysis.failedCount > 0 ? ` or failed to complete` : ""}.`,
      cta: "View errors",
      filter: "error",
    });
  }
  if (analysis.slowCount > 0) {
    findings.push({
      icon: <Snail className="h-4 w-4" aria-hidden="true" />,
      tone: "warn",
      title: "Slow requests",
      detail: `${analysis.slowCount} request${analysis.slowCount === 1 ? "" : "s"} took longer than 1 second.`,
      cta: "View slow requests",
      filter: "slow",
    });
  }
  if (analysis.largeCount > 0) {
    findings.push({
      icon: <Package className="h-4 w-4" aria-hidden="true" />,
      tone: "warn",
      title: "Large responses",
      detail: `${analysis.largeCount} response${analysis.largeCount === 1 ? "" : "s"} exceeded 512 KB of transferred data.`,
      cta: "View large responses",
      filter: "large",
    });
  }
  if (analysis.corsCount > 0) {
    findings.push({
      icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
      tone: "warn",
      title: "Possible CORS issues",
      detail: `${analysis.corsCount} cross-origin request${analysis.corsCount === 1 ? "" : "s"} missing CORS headers or blocked.`,
      cta: "View CORS issues",
      filter: "cors",
    });
  }
  const thirdPartyDomains = analysis.domains.filter((d) => d.thirdParty).length;
  if (thirdPartyDomains > 0) {
    findings.push({
      icon: <Globe className="h-4 w-4" aria-hidden="true" />,
      tone: "info",
      title: "Third-party requests",
      detail: `This capture contacted ${thirdPartyDomains} third-party domain${thirdPartyDomains === 1 ? "" : "s"}.`,
      cta: "View third-party requests",
      filter: "thirdparty",
    });
  }
  if (analysis.sensitiveRequestCount > 0) {
    findings.push({
      icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
      tone: "warn",
      title: "Sensitive information",
      detail: `${analysis.sensitiveRequestCount} request${analysis.sensitiveRequestCount === 1 ? "" : "s"} contain potentially sensitive data (tokens, cookies, credentials).`,
      cta: "Review requests",
      filter: "sensitive",
    });
  }

  return (
    <div className="space-y-6">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OverviewCard label="Requests" value={String(analysis.totalRequests)} icon={<Network className="h-3.5 w-3.5" aria-hidden="true" />}>
          <p>{analysis.uniqueHosts} domain{analysis.uniqueHosts === 1 ? "" : "s"} contacted</p>
        </OverviewCard>

        <OverviewCard
          label="Errors"
          value={String(analysis.errorCount)}
          icon={<FileWarning className="h-3.5 w-3.5" aria-hidden="true" />}
          tone="danger"
          onClick={analysis.errorCount > 0 ? () => onInvestigate("error") : undefined}
        >
          {analysis.errorCount > 0 ? (
            <p>
              {[
                analysis.errors4xx > 0 && `${analysis.errors4xx} × 4xx`,
                analysis.errors5xx > 0 && `${analysis.errors5xx} × 5xx`,
                analysis.failedCount > 0 && `${analysis.failedCount} × failed`,
              ]
                .filter(Boolean)
                .join(" · ")}
              {" · Click to view"}
            </p>
          ) : (
            <p>No failed requests</p>
          )}
        </OverviewCard>

        <OverviewCard label="Load time" value={formatMs(analysis.totalTimeMs)} icon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />}>
          {analysis.slowest && (
            <p>
              <button
                onClick={() => onOpenEntry(analysis.slowest!)}
                className="text-left hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-foreground rounded-sm"
                title="Open details for the slowest request"
              >
                Slowest: <span className="font-semibold text-foreground">{formatMs(analysis.slowest.timeMs)}</span>{" "}
                <span className="font-mono break-all">{analysis.slowest.path || analysis.slowest.host}</span>
              </button>
            </p>
          )}
        </OverviewCard>

        <OverviewCard label="Data transferred" value={formatBytes(analysis.totalSizeBytes)} icon={<Database className="h-3.5 w-3.5" aria-hidden="true" />}>
          {analysis.largest && (
            <p>
              <button
                onClick={() => onOpenEntry(analysis.largest!)}
                className="text-left hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-foreground rounded-sm"
                title="Open details for the largest response"
              >
                Largest: <span className="font-semibold text-foreground">{formatBytes(analysis.largest.sizeBytes)}</span>{" "}
                <span className="font-mono break-all">{analysis.largest.path || analysis.largest.host}</span>
              </button>
            </p>
          )}
        </OverviewCard>
      </div>

      {/* Onboarding strip */}
      <div className="border border-border rounded-lg bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground leading-relaxed select-none">
        <strong className="text-foreground font-bold">How to explore:</strong>{" "}
        <span className="font-semibold text-foreground">Timeline</span> shows when requests happened,{" "}
        <span className="font-semibold text-foreground">Requests</span> lets you browse and filter everything, and{" "}
        <span className="font-semibold text-foreground">Domains</span> breaks the capture down per domain. Clicking
        any request opens its details without leaving the view.
      </div>

      {/* Request breakdown */}
      {categoryBreakdown.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Request breakdown
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {categoryBreakdown.map((c) => (
              <button
                key={c}
                onClick={() => onInvestigate(c)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary/40 transition-colors focus:outline-none focus:ring-1 focus:ring-foreground"
                title={`View ${CATEGORY_META[c].label} requests`}
              >
                {CATEGORY_META[c].label}
                <span className="text-muted-foreground font-bold">{analysis.categoryCounts[c]}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Things worth looking at */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Things worth looking at
        </h3>
        {findings.length === 0 ? (
          <div className="border border-border rounded-lg bg-card px-4 py-5 text-center">
            <p className="text-sm font-semibold text-foreground">No obvious problems found</p>
            <p className="text-xs text-muted-foreground mt-1">
              All requests completed without errors, and nothing unusually slow or large was detected.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {findings.map((f) => (
              <button
                key={f.title}
                onClick={() => onInvestigate(f.filter)}
                className="group flex items-start gap-3 border border-border rounded-lg bg-card px-4 py-3 text-left hover:bg-secondary/40 transition-colors focus:outline-none focus:ring-1 focus:ring-foreground"
              >
                <span
                  className={`shrink-0 mt-0.5 ${
                    f.tone === "danger"
                      ? "text-destructive"
                      : f.tone === "warn"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {f.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-foreground">{f.title}</span>
                  <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">{f.detail}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground mt-1.5 group-hover:gap-1.5 transition-all">
                    {f.cta}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
