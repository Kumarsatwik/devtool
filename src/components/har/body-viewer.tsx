"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { prettyBody, BODY_PREVIEW_LIMIT, formatBytes } from "@/lib/har";

/* ---------- JSON tree ---------- */

function TreeNode({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isObj = value !== null && typeof value === "object";
  const isArr = Array.isArray(value);

  if (!isObj) {
    const text = value === null ? "null" : typeof value === "string" ? `"${value}"` : String(value);
    const cls =
      value === null
        ? "text-muted-foreground italic"
        : typeof value === "string"
          ? "text-emerald-700 dark:text-emerald-400"
          : typeof value === "number"
            ? "text-blue-600 dark:text-blue-400"
            : "text-purple-600 dark:text-purple-400";
    return (
      <div className="flex gap-1.5 leading-relaxed">
        <span className="text-foreground font-semibold shrink-0">{name}:</span>
        <span className={`break-all ${cls}`}>{text}</span>
      </div>
    );
  }

  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-foreground font-semibold hover:bg-secondary/50 rounded px-0.5 -mx-0.5 focus:outline-none focus:ring-1 focus:ring-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <span>{name}</span>
        <span className="text-muted-foreground font-normal">
          {isArr ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {open && (
        <div className="ml-3 pl-2 border-l border-border space-y-0.5 mt-0.5">
          {entries.map(([k, v]) => (
            <TreeNode key={k} name={k} value={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Body viewer with Pretty / Tree / Raw ---------- */

type ViewMode = "pretty" | "tree" | "raw";

export function BodyViewer({
  body,
  mimeType,
  emptyHint = "No body captured in this HAR entry.",
}: {
  body: string | null;
  mimeType?: string;
  emptyHint?: string;
}) {
  const [mode, setMode] = useState<ViewMode>("pretty");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    if (!body) return { ok: false as const, value: undefined };
    const looksJson = (mimeType ?? "").toLowerCase().includes("json") || /^[{[]/.test(body.trim());
    if (!looksJson) return { ok: false as const, value: undefined };
    try {
      return { ok: true as const, value: JSON.parse(body) as unknown };
    } catch {
      return { ok: false as const, value: undefined };
    }
  }, [body, mimeType]);

  if (!body) {
    return <p className="text-muted-foreground italic text-xs">{emptyHint}</p>;
  }

  const pretty = parsed.ok ? prettyBody(body, mimeType) : body;
  const shown = pretty.length > BODY_PREVIEW_LIMIT ? pretty.slice(0, BODY_PREVIEW_LIMIT) : pretty;
  const truncated = pretty.length > BODY_PREVIEW_LIMIT;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const effectiveMode: ViewMode = parsed.ok ? mode : "raw";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1" role="tablist" aria-label="Body view mode">
          {parsed.ok ? (
            (["pretty", "tree", "raw"] as ViewMode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={effectiveMode === m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded border text-xs font-semibold capitalize transition-colors ${
                  effectiveMode === m
                    ? "bg-secondary text-foreground border-border"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {mimeType || "Body"}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {effectiveMode === "tree" && parsed.ok ? (
        <div className="border border-border rounded bg-card px-3 py-2 font-mono text-xs max-h-72 overflow-y-auto space-y-0.5">
          <TreeNode name={Array.isArray(parsed.value) ? "array" : "root"} value={parsed.value} depth={0} />
        </div>
      ) : (
        <pre className="border border-border rounded bg-card px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all max-h-72 overflow-y-auto">
          {effectiveMode === "raw" ? body : shown}
          {truncated && effectiveMode !== "raw" && (
            <span className="text-muted-foreground">
              {"\n"}… truncated ({formatBytes(pretty.length)} total)
            </span>
          )}
        </pre>
      )}
    </div>
  );
}
