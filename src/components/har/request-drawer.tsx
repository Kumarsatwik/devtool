"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { RequestDetail } from "@/components/har/request-detail";
import type { AnalyzedEntry } from "@/lib/har";

/**
 * Slide-over drawer that wraps RequestDetail.
 * Renders on top of any tab with a darkened backdrop.
 */
export function RequestDrawer({
  entry,
  onClose,
}: {
  entry: AnalyzedEntry;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the drawer when open
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Request details"
        tabIndex={-1}
        className="relative w-full max-w-2xl h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        {/* Fixed header with close */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card/30">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Request Details
          </span>
          <button
            onClick={onClose}
            aria-label="Close detail panel"
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-foreground rounded px-2 py-1"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <RequestDetail entry={entry} onBack={onClose} />
        </div>
      </div>
    </div>
  );
}
