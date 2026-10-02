"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Clock,
  Eye,
  List,
  Palette,
  Printer,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildNotePreview,
  PREVIEW_THEMES,
  type HeadingItem,
  type PreviewTheme,
} from "@/lib/notes/exporters";

interface NotePreviewProps {
  /** Note title shown in the preview header and document heading. */
  title: string;
  /** Editor HTML captured when the preview was opened. */
  editorHtml: string;
  onClose: () => void;
}

interface PreviewStats {
  words: number;
  chars: number;
  diagrams: number;
  readTimeMin: number;
}

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Rich, full-width preview of the current note. The document is
 * rendered in a sandboxed iframe using the same pipeline as the HTML export,
 * with real-time themes and document outline navigation.
 */
export function NotePreview({ title, editorHtml, onClose }: NotePreviewProps) {
  const [snapshot] = useState(() => ({
    title: title.trim() || "Untitled note",
    html: editorHtml,
  }));
  const [theme, setTheme] = useState<PreviewTheme>("default");
  const [showToc, setShowToc] = useState(false);

  const [doc, setDoc] = useState<string | null>(null);
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [stats, setStats] = useState<PreviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Render the document whenever snapshot or theme changes
  useEffect(() => {
    let cancelled = false;
    buildNotePreview(snapshot.title, snapshot.html, { theme })
      .then(({ html, headings: nextHeadings }) => {
        if (cancelled) return;
        setDoc(html);
        setHeadings(nextHeadings);
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const text = parsed.body.textContent ?? "";
        const words = text
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;
        const chars = text.length;
        const diagrams = parsed.querySelectorAll(".mermaid-diagram").length;
        const readTimeMin = Math.max(1, Math.round(words / 200));

        setStats({ words, chars, diagrams, readTimeMin });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot, theme]);

  // Lock background scrolling, move focus into the dialog, restore on close
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  // Escape also closes while the iframe holds focus
  const handleFrameLoad = () => {
    const frameDoc = iframeRef.current?.contentWindow?.document;
    frameDoc?.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    });
  };

  // Keep Tab inside the dialog
  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const print = () => iframeRef.current?.contentWindow?.print();

  const handleScrollToHeading = (id: string) => {
    try {
      const frameDoc = iframeRef.current?.contentWindow?.document;
      const el = frameDoc?.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // ignore cross-frame scroll exceptions if any
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${snapshot.title}`}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="relative flex flex-1 flex-col overflow-hidden bg-card outline-none w-full h-full"
      >
        {/* Header toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card/60 px-4 py-2.5 sm:gap-3">
          <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="hidden text-xs font-bold tracking-wider text-muted-foreground uppercase sm:inline">
            Preview
          </span>
          <span
            className="min-w-0 max-w-[180px] truncate text-sm font-semibold text-foreground sm:max-w-[280px]"
            title={snapshot.title}
          >
            {snapshot.title}
          </span>

          {stats && (
            <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground md:flex">
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {stats.words.toLocaleString()} words
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {stats.readTimeMin} min read
              </span>
              {stats.diagrams > 0 && (
                <>
                  <span>·</span>
                  <span>
                    {stats.diagrams} {stats.diagrams === 1 ? "diagram" : "diagrams"}
                  </span>
                </>
              )}
            </div>
          )}

          <span className="flex-1" />

          {/* Outline / TOC Toggle */}
          {headings.length > 0 && (
            <Button
              type="button"
              variant={showToc ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowToc((v) => !v)}
              className="shrink-0 gap-1.5 text-xs"
              title="Toggle Table of Contents"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Outline</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 font-mono text-[10px]">
                {headings.length}
              </span>
            </Button>
          )}

          {/* Theme selector */}
          <div className="flex shrink-0 items-center gap-1">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              aria-label="Preview theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as PreviewTheme)}
              className="h-7 shrink-0 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {(Object.keys(PREVIEW_THEMES) as PreviewTheme[]).map((key) => (
                <option key={key} value={key}>
                  {PREVIEW_THEMES[key].label}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={print}
            disabled={!doc}
            className="shrink-0"
            title="Print or export as PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content body + optional TOC sidebar */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/60">
          {/* TOC Outline Drawer */}
          {showToc && headings.length > 0 && (
            <aside className="w-64 shrink-0 border-r border-border bg-card/95 p-3 overflow-y-auto animate-in slide-in-from-left-4 duration-200">
              <div className="mb-2 flex items-center justify-between pb-1 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Document Outline</span>
                <button
                  type="button"
                  onClick={() => setShowToc(false)}
                  className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 text-xs">
                {headings.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleScrollToHeading(h.id)}
                    style={{ paddingLeft: `${Math.max(0, (h.level - 1) * 12 + 6)}px` }}
                    className="truncate py-1.5 pr-2 text-left rounded hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                    title={h.text}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {/* IFrame Viewport Stage */}
          <div
            className="relative min-h-0 flex-1 overflow-auto p-0 transition-colors duration-200"
            style={{ backgroundColor: PREVIEW_THEMES[theme]?.bg ?? "#ffffff" }}
          >
            {error ? (
              <div className="flex h-full items-center justify-center p-6">
                <p className="max-w-md rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                  Could not build the preview: {error}
                </p>
              </div>
            ) : doc ? (
              <div className="w-full h-full">
                <iframe
                  ref={iframeRef}
                  title={`Preview of ${snapshot.title}`}
                  sandbox="allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox"
                  srcDoc={doc}
                  tabIndex={-1}
                  onLoad={handleFrameLoad}
                  className="h-full w-full border-0"
                  style={{ backgroundColor: PREVIEW_THEMES[theme]?.bg ?? "#ffffff" }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
                <Eye className="h-4 w-4 animate-pulse" />
                Rendering preview and diagrams…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
