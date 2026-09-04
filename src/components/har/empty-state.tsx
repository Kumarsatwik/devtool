"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { FileUpload } from "@/components/file-upload";

const CAPABILITIES = [
  "Requests & responses",
  "API payloads",
  "Errors & failures",
  "Timing breakdowns",
  "Headers & cookies",
  "Third-party activity",
  "Potentially sensitive data",
];

export function EmptyState({
  onFileLoaded,
  onLoadSample,
  error,
}: {
  onFileLoaded: (content: string) => void;
  onLoadSample: () => void;
  error: string | null;
}) {
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto py-10 px-4 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3 select-none">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Understand what happened on your webpage
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Drop a HAR file to inspect requests, responses, timing, errors, and network activity.
          </p>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Your file is processed locally in your browser — never uploaded or stored.
          </p>
        </div>

        {/* Drop zone */}
        <FileUpload
          onFileLoaded={(content) => onFileLoaded(content)}
          accept=".har,.json"
          maxSizeMB={100}
          label="Drop your HAR file here, or click to choose a file"
        />

        {/* Error reporting — friendly first, technical second */}
        {error && (
          <div className="border border-destructive/25 bg-destructive/5 rounded-lg px-4 py-3 space-y-1.5" role="alert">
            <p className="text-sm font-bold text-destructive">We couldn’t read this HAR file</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The file doesn’t appear to contain a valid HAR structure. Try exporting the HAR again from your
              browser’s developer tools (Network panel → right-click → “Save all as HAR with content”).
            </p>
            {(error) && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                  Technical error details
                </summary>
                <pre className="mt-1.5 font-mono text-xs text-destructive/90 whitespace-pre-wrap break-all">
                  {error}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Secondary actions */}
        <div className="flex items-center justify-center gap-4 text-sm font-semibold select-none">
          <button
            onClick={() => setShowPaste((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPaste ? "Hide paste area" : "Paste HAR content instead"}
          </button>
          <span className="text-border">·</span>
          <button onClick={onLoadSample} className="text-muted-foreground hover:text-foreground transition-colors">
            Try a sample HAR
          </button>
        </div>

        {showPaste && (
          <div className="space-y-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder='{"log": {"version": "1.2", "entries": [...]}}'
              spellCheck={false}
              aria-label="Paste HAR content"
              className="h-40 w-full bg-background border border-border rounded-xl p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={() => pasteText.trim() && onFileLoaded(pasteText)}
              disabled={!pasteText.trim()}
              className="px-4 py-2 rounded bg-foreground text-background text-sm font-bold disabled:opacity-40"
            >
              Analyze pasted HAR
            </button>
          </div>
        )}

        {/* Capabilities */}
        <div className="border border-border rounded-lg bg-card px-5 py-4 select-none">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
            What you can inspect
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {CAPABILITIES.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
