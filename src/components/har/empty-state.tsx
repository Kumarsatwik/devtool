"use client";

import { useState, useRef, useCallback } from "react";
import { Check, Lock, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      if (file.size > 100 * 1024 * 1024) {
        setFileError("File exceeds the 100 MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") onFileLoaded(result);
        else setFileError("Could not read the file contents.");
      };
      reader.onerror = () => setFileError("Could not read the file contents.");
      reader.readAsText(file);
    },
    [onFileLoaded],
  );

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
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Choose or drop a HAR file"
          className={cn(
            "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-foreground",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/40",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".har,.json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <Upload className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-bold text-foreground">Drop your HAR file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to choose a file (.har, .json)</p>
          </div>
          <span className="px-5 py-2.5 rounded bg-foreground text-background text-sm font-bold shadow-sm">
            Choose HAR file
          </span>
        </div>

        {/* Error reporting — friendly first, technical second */}
        {(error || fileError) && (
          <div className="border border-destructive/25 bg-destructive/5 rounded-lg px-4 py-3 space-y-1.5" role="alert">
            <p className="text-sm font-bold text-destructive">We couldn’t read this HAR file</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The file doesn’t appear to contain a valid HAR structure. Try exporting the HAR again from your
              browser’s developer tools (Network panel → right-click → “Save all as HAR with content”).
            </p>
            {(error || fileError) && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                  Technical error details
                </summary>
                <pre className="mt-1.5 font-mono text-xs text-destructive/90 whitespace-pre-wrap break-all">
                  {error ?? fileError}
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
