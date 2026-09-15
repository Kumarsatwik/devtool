"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Check, AlertCircle, ShieldAlert, Lock, ChevronDown, ChevronRight, ChevronUp, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BodyViewer } from "@/components/har/body-viewer";
import { MaskedValue } from "@/components/har/masked-value";
import {
  CATEGORY_META,
  TIMING_PHASES,
  buildCurl,
  decodeBody,
  explainEntry,
  formatBytes,
  formatMs,
  isBinaryBody,
  isSensitiveHeader,
  type AnalyzedEntry,
  type HarEntry,
} from "@/lib/har";

/* ---------- small bits ---------- */

/** Copy button with a dropdown of copy options (URL, cURL, headers, body, …). */
function CopyDropdown({ entry, align = "right" }: { entry: HarEntry; align?: "right" | "left" }) {
  const [open, setOpen] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options: { key: string; label: string; hint: string; get: () => string }[] = [
    { key: "url", label: "URL", hint: entry.request.url, get: () => entry.request.url },
    { key: "curl", label: "cURL command", hint: "curl -X …", get: () => buildCurl(entry) },
    {
      key: "query",
      label: "Query parameters",
      hint: "name=value pairs",
      get: () =>
        (entry.request.url.includes("?") ? entry.request.url.split("?")[1] ?? "" : "")
          .split("&")
          .filter(Boolean)
          .join("\n"),
    },
    {
      key: "headers",
      label: "Request headers",
      hint: "Name: value lines",
      get: () => (entry.request.headers ?? []).map((h) => `${h.name}: ${h.value}`).join("\n"),
    },
    {
      key: "body",
      label: "Request body",
      hint: entry.request.postData ? "Raw body text" : "No body recorded",
      get: () => entry.request.postData?.text ?? "",
    },
    {
      key: "request",
      label: "Full request (JSON)",
      hint: "Method, URL, headers & body",
      get: () =>
        JSON.stringify(
          {
            method: entry.request.method,
            url: entry.request.url,
            httpVersion: entry.request.httpVersion,
            headers: entry.request.headers ?? [],
            queryString: entry.request.queryString ?? [],
            cookies: entry.request.cookies ?? [],
            postData: entry.request.postData,
          },
          null,
          2,
        ),
    },
  ];

  const copy = async (key: string, get: () => string) => {
    const text = get();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLabel(key);
      setTimeout(() => setCopiedLabel(null), 2000);
    } catch {}
  };

  return (
    <div ref={menuRef} className="relative shrink-0">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="font-semibold rounded shadow-sm"
      >
        <Copy className="h-4 w-4 mr-1.5" />
        Copy
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Copy options"
          className={`absolute z-20 mt-1.5 w-72 rounded-lg border border-border bg-card shadow-xl overflow-hidden ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
            Copy request data
          </div>
          {options.map((o) => (
            <button
              key={o.key}
              role="menuitem"
              onClick={() => copy(o.key, o.get)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-foreground"
            >
              {copiedLabel === o.key ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
              ) : (
                <FileJson className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-foreground">{o.label}</span>
                <span className="block text-xs text-muted-foreground truncate">{copiedLabel === o.key ? "Copied to clipboard" : o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function statusBadge(status: number, statusText: string) {
  const cls =
    status === 0 || status >= 400
      ? "bg-destructive/10 text-destructive border-destructive/25"
      : status >= 300
        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold ${cls}`}>
      {status === 0 ? "Failed" : `${status} ${statusText}`.trim()}
    </span>
  );
}

function KeyValueTable({
  rows,
  mask,
  emptyHint,
}: {
  rows: { name: string; value: string }[];
  mask?: (name: string, value: string) => boolean;
  emptyHint: string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (rows.length === 0) return <p className="text-muted-foreground italic text-xs">{emptyHint}</p>;
  const shown = showAll ? rows : rows.slice(0, 12);
  return (
    <div>
      <div className="border border-border rounded bg-card divide-y divide-border max-h-72 overflow-y-auto">
        {shown.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(120px,220px)_1fr] gap-2 px-3 py-2 text-xs">
            <span className="font-mono font-semibold text-foreground break-all">{r.name}</span>
            <span className="font-mono text-muted-foreground break-all min-w-0">
              {mask?.(r.name, r.value) ? <MaskedValue value={r.value} /> : r.value}
            </span>
          </div>
        ))}
      </div>
      {rows.length > 12 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? "Show fewer" : `Show ${rows.length - 12} more`}
        </button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-secondary/40 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-foreground"
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-3 border-t border-border/60">{children}</div>}
    </section>
  );
}

/* ---------- tabs ---------- */

type TabKey = "overview" | "request" | "response" | "timing" | "cookies";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "request", label: "Request" },
  { key: "response", label: "Response" },
  { key: "timing", label: "Timing" },
  { key: "cookies", label: "Cookies" },
];

export function RequestDetail({ entry, onBack }: { entry: AnalyzedEntry; onBack: () => void }) {
  const [tab, setTab] = useState<TabKey>("overview");

  const explanation = explainEntry(entry);
  const content = entry.raw.response.content;
  const reqBody = decodeBody(
    entry.raw.request.postData?.text,
    undefined,
    entry.raw.request.postData?.mimeType,
  );
  const resBody = decodeBody(content?.text, content?.encoding, content?.mimeType);
  const resBinary = isBinaryBody(content?.encoding, content?.mimeType, content?.text);
  const imagePreview =
    content?.mimeType?.startsWith("image/") && content.encoding === "base64" && content.text
      ? `data:${content.mimeType};base64,${content.text}`
      : content?.mimeType === "image/svg+xml" && resBody
        ? `data:image/svg+xml;utf8,${encodeURIComponent(resBody)}`
        : null;

  const timings = entry.raw.timings;
  const phases = TIMING_PHASES.map((p) => ({
    ...p,
    value: typeof timings?.[p.key] === "number" && (timings[p.key] as number) >= 0 ? (timings[p.key] as number) : null,
  }));
  const totalPhase = phases.reduce((acc, p) => acc + (p.value ?? 0), 0);
  const maxPhase = Math.max(...phases.map((p) => p.value ?? 0), 1);

  const cookieCount = entry.reqCookies.length + entry.resCookies.length;

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      {/* Header */}
      <div className="shrink-0 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onBack} className="font-semibold -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to requests
          </Button>
          <span className="text-muted-foreground/40">·</span>
          {statusBadge(entry.status, entry.statusText)}
          <span className="text-sm text-muted-foreground">
            {CATEGORY_META[entry.category].label}
            {entry.isThirdParty && " · Third-party"}
            {" · "}
            {formatMs(entry.timeMs)}
            {" · "}
            {formatBytes(entry.sizeBytes)}
          </span>
        </div>
        <div className="flex items-start gap-2 min-w-0">
          <h2 className="text-base font-bold font-mono break-all text-foreground flex-1 min-w-0">
            <span className="text-muted-foreground">{entry.method}</span> {entry.path || entry.url}
          </h2>
          <CopyDropdown entry={entry.raw} align="right" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 shrink-0 flex-wrap select-none border-b border-border pb-2" role="tablist" aria-label="Request detail sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded border text-sm font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-foreground ${
              tab === t.key
                ? "bg-secondary text-foreground border-border"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/45"
            }`}
          >
            {t.label}
            {t.key === "cookies" && cookieCount > 0 && (
              <span className="ml-1.5 text-xs font-bold text-muted-foreground">{cookieCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="w-full space-y-5 pb-6">
          {tab === "overview" && (
            <>
              {explanation && (
                <Section title="What happened?">
                  <p className="text-sm text-foreground leading-relaxed border border-border rounded bg-card px-3 py-2.5">
                    {explanation}
                  </p>
                </Section>
              )}

              {entry.issues.length > 0 && (
                <Section title="Problems detected">
                  <div className="space-y-2">
                    {entry.issues.map((issue, i) => (
                      <p
                        key={i}
                        className={`flex items-start gap-1.5 text-sm ${
                          issue.kind === "error" || issue.kind === "auth"
                            ? "text-destructive"
                            : issue.kind === "cors"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        <AlertCircle className="h-4 w-4 mt-px shrink-0" aria-hidden="true" />
                        <span>
                          <strong>{issue.label}.</strong> {issue.detail}
                        </span>
                      </p>
                    ))}
                  </div>
                </Section>
              )}

              {entry.sensitive.length > 0 && (
                <Section title="Sensitive information detected">
                  <div className="border border-amber-500/25 bg-amber-500/5 rounded px-3 py-2.5 space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      Detection is heuristic and may not be perfect. Values are masked by default.
                    </p>
                    {entry.sensitive.map((f, i) => (
                      <div key={i} className="grid grid-cols-[minmax(120px,200px)_1fr] gap-2 text-xs items-baseline">
                        <span className="text-muted-foreground">
                          {f.where} · <span className="font-semibold text-foreground">{f.name}</span>
                        </span>
                        <MaskedValue value={f.value} className="min-w-0" />
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Summary">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["Status", entry.status === 0 ? "Failed" : `${entry.status} ${entry.statusText}`.trim()],
                    ["Type", CATEGORY_META[entry.category].label + (entry.isThirdParty ? " · third-party" : "")],
                    ["Duration", formatMs(entry.timeMs)],
                    ["Response size", formatBytes(entry.sizeBytes)],
                  ].map(([k, v]) => (
                    <div key={k} className="border border-border bg-card rounded px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5 break-all">{v}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {tab === "request" && (
            <>
              <CollapsibleSection title={`Query parameters (${entry.queryParams.length})`}>
                <KeyValueTable rows={entry.queryParams} emptyHint="No query parameters." />
              </CollapsibleSection>

              <CollapsibleSection title={`Request headers (${(entry.raw.request.headers ?? []).length})`}>
                <KeyValueTable
                  rows={entry.raw.request.headers ?? []}
                  mask={isSensitiveHeader}
                  emptyHint="No request headers recorded."
                />
              </CollapsibleSection>

              <CollapsibleSection title="Request body">
                {entry.raw.request.postData?.params?.length ? (
                  <KeyValueTable
                    rows={entry.raw.request.postData.params}
                    mask={(name) => /pass|secret|token|key|auth/i.test(name)}
                    emptyHint=""
                  />
                ) : (
                  <BodyViewer body={reqBody} mimeType={entry.raw.request.postData?.mimeType} emptyHint="This request has no body." />
                )}
              </CollapsibleSection>
            </>
          )}

          {tab === "response" && (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg font-bold">{statusBadge(entry.status, entry.statusText)}</span>
                <span className="text-sm text-muted-foreground">
                  {entry.mimeType} · {formatBytes(entry.sizeBytes)} · {formatMs(entry.timeMs)}
                </span>
              </div>

              <CollapsibleSection title={`Response headers (${(entry.raw.response.headers ?? []).length})`}>
                <KeyValueTable
                  rows={(entry.raw.response.headers ?? []).filter((h) => h.name.toLowerCase() !== "set-cookie")}
                  mask={isSensitiveHeader}
                  emptyHint="No response headers recorded."
                />
              </CollapsibleSection>

              <CollapsibleSection title="Response body">
                {imagePreview ? (
                  <div className="border border-border rounded bg-card p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Response image preview" className="max-w-full max-h-72 rounded" />
                  </div>
                ) : resBinary ? (
                  <p className="text-muted-foreground italic text-xs border border-border rounded bg-card px-3 py-2.5">
                    This response contains binary data ({entry.mimeType}) that can’t be displayed as text.
                  </p>
                ) : (
                  <BodyViewer body={resBody} mimeType={content?.mimeType} emptyHint="Response body not captured in this HAR entry." />
                )}
              </CollapsibleSection>
            </>
          )}

          {tab === "timing" && (
            <>
              <Section title={`Timing breakdown — ${formatMs(entry.timeMs)} total`}>
                {phases.every((p) => p.value === null) ? (
                  <p className="text-muted-foreground italic text-xs">No timing data recorded for this request.</p>
                ) : (
                  <div className="border border-border rounded bg-card px-3 py-2.5 space-y-2">
                    {phases.map((p) => (
                      <div key={p.key} className="grid grid-cols-[110px_1fr_64px] items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground truncate">{p.label}</span>
                        <span className="h-3.5 bg-muted/60 rounded overflow-hidden" aria-hidden="true">
                          {p.value !== null && (
                            <span
                              className="block h-full bg-blue-500/70 dark:bg-blue-400/70 rounded"
                              style={{ width: `${Math.max((p.value / maxPhase) * 100, 1.5)}%` }}
                            />
                          )}
                        </span>
                        <span className="font-mono text-right text-muted-foreground">
                          {p.value === null ? "—" : formatMs(p.value)}
                        </span>
                      </div>
                    ))}
                    <div className="grid grid-cols-[110px_1fr_64px] items-center gap-2 text-xs border-t border-border pt-1.5">
                      <span className="font-bold text-foreground">Total</span>
                      <span />
                      <span className="font-mono text-right font-bold text-foreground">
                        {formatMs(totalPhase || entry.timeMs)}
                      </span>
                    </div>
                  </div>
                )}
              </Section>
              <Section title="What do these mean?">
                <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                  {phases
                    .filter((p) => p.value !== null)
                    .map((p) => (
                      <p key={p.key}>
                        <strong className="text-foreground">{p.label}</strong> — {p.explain}
                      </p>
                    ))}
                  <p className="italic">“—” means the phase was not recorded in this HAR file.</p>
                </div>
              </Section>
            </>
          )}

          {tab === "cookies" && (
            <>
              <Section title={`Request cookies (${entry.reqCookies.length})`}>
                <KeyValueTable rows={entry.reqCookies} mask={() => true} emptyHint="No request cookies recorded." />
              </Section>
              <Section title={`Response cookies (${entry.resCookies.length})`}>
                <KeyValueTable rows={entry.resCookies} mask={() => true} emptyHint="No response cookies recorded." />
              </Section>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Cookie values are masked by default. Use the eye icon to reveal a value.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
