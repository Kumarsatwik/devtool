"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, X } from "lucide-react";
import { RequestDetail } from "@/components/har/request-detail";
import type { AnalyzedEntry } from "@/lib/har";
import { clampPixels } from "@/lib/split";

const MIN_DRAWER_WIDTH = 420;
const MAX_DRAWER_WIDTH = 1200;
const DEFAULT_DRAWER_WIDTH = 1024;
const DRAWER_STEP = 32;

/**
 * Slide-over drawer that wraps RequestDetail.
 * Renders on top of any tab with a darkened backdrop. Its width is draggable
 * from the left edge, or adjustable with the arrow keys.
 */
export function RequestDrawer({
  entry,
  onClose,
}: {
  entry: AnalyzedEntry;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_DRAWER_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // Trap focus inside the drawer when open
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isResizing) return;
      // Right-aligned drawer: dragging left widens it.
      setWidth(clampPixels(window.innerWidth - event.clientX, MIN_DRAWER_WIDTH, MAX_DRAWER_WIDTH));
    },
    [isResizing],
  );

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setWidth((prev) => clampPixels(prev + DRAWER_STEP, MIN_DRAWER_WIDTH, MAX_DRAWER_WIDTH));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setWidth((prev) => clampPixels(prev - DRAWER_STEP, MIN_DRAWER_WIDTH, MAX_DRAWER_WIDTH));
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize request details panel"
        aria-valuenow={Math.round(width)}
        aria-valuemin={MIN_DRAWER_WIDTH}
        aria-valuemax={MAX_DRAWER_WIDTH}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setIsResizing(false)}
        onPointerCancel={() => setIsResizing(false)}
        onKeyDown={handleKeyDown}
        className="relative z-10 hidden sm:flex shrink-0 items-center justify-center w-2 cursor-col-resize group outline-none touch-none"
      >
        <GripVertical
          className={`h-4 w-4 transition-colors ${
            isResizing ? "text-primary" : "text-muted-foreground/50 group-hover:text-primary"
          }`}
        />
      </div>

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Request details"
        tabIndex={-1}
        style={{ width: `${width}px`, maxWidth: "100%" }}
        className={`relative h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden ${isResizing ? "select-none" : ""}`}
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
