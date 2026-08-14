"use client";

import { useState, useRef, useEffect } from "react";
import { Lock } from "lucide-react";

/**
 * Compact privacy indicator with a details popover.
 * Every claim here is backed by the implementation: parsing and analysis run
 * entirely in browser memory (React state) — no network calls, no storage APIs.
 */
export function PrivacyBadge() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 transition-colors focus:outline-none focus:ring-1 focus:ring-foreground"
      >
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Processed locally</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Privacy details"
          className="absolute left-0 top-full mt-1.5 z-30 w-72 rounded-lg border border-border bg-popover p-3.5 shadow-lg text-sm"
        >
          <p className="font-bold text-foreground flex items-center gap-1.5 mb-1.5">
            <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Your HAR file never leaves your browser
          </p>
          <ul className="space-y-1 text-muted-foreground leading-relaxed list-disc pl-4">
            <li>Parsing and analysis run entirely in this tab</li>
            <li>No upload, no server-side storage</li>
            <li>No request or response contents sent to analytics</li>
            <li>Nothing is written to disk or local storage</li>
            <li>Use “Clear” to drop the loaded file from memory</li>
            <li>Closing or reloading the tab discards everything</li>
          </ul>
        </div>
      )}
    </div>
  );
}
