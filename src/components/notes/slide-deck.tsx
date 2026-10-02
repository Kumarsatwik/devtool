"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Highlighter,
  LayoutGrid,
  Maximize,
  Minimize,
  Palette,
  Presentation,
  Sliders,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildSlideDeck,
  SLIDE_BRIDGE_TAG,
  SLIDE_CMD_TAG,
  SLIDE_THEMES,
  SLIDE_TRANSITIONS,
  type SlideDeckInfo,
  type SlideSeparator,
  type SlideTheme,
  type SlideTransition,
} from "@/lib/notes/slides";

interface SlideDeckProps {
  title: string;
  editorHtml: string;
  onClose: () => void;
}

interface DeckState {
  index: number;
  total: number;
  overview: boolean;
  marker: boolean;
  fontScale: number;
}

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])';

const SEPARATORS: { value: SlideSeparator; label: string; hint: string }[] = [
  { value: "hr", label: "Breaks (---)", hint: "Split on --- rules" },
  { value: "heading", label: "Headings (H1/H2)", hint: "Split on H1 / H2" },
  { value: "both", label: "Both (--- & H1/H2)", hint: "Breaks and headings" },
];

/**
 * Slide deck presenting notes with configurable transitions.
 * Features theme presets, transitions (fade, slide, zoom, flip, none),
 * temporary fading drawing marker, content font resize, and responsive stage scaling.
 */
export function SlideDeck({ title, editorHtml, onClose }: SlideDeckProps) {
  const [snapshot] = useState(() => ({
    title: title.trim() || "Untitled note",
    html: editorHtml,
  }));
  const [separator, setSeparator] = useState<SlideSeparator>("hr");
  const [theme, setTheme] = useState<SlideTheme>("dark");
  const [transition, setTransition] = useState<SlideTransition>("fade");

  const [doc, setDoc] = useState<string | null>(null);
  const [, setInfo] = useState<SlideDeckInfo | null>(null);
  const [state, setState] = useState<DeckState>({
    index: 0,
    total: 0,
    overview: false,
    marker: false,
    fontScale: 100,
  });
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const transitionRef = useRef(transition);
  useEffect(() => {
    transitionRef.current = transition;
  }, [transition]);

  // Build the deck whenever snapshot, separator, or theme changes
  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    buildSlideDeck(snapshot.title, snapshot.html, {
      separator,
      theme,
      transition: transitionRef.current,
    })
      .then(({ doc: html, info: next }) => {
        if (cancelled) return;
        setInfo(next);
        setDoc(html);
        setState((prev) => ({
          ...prev,
          index: 0,
          total: next.slides.length,
          overview: false,
        }));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot, separator, theme]);

  const sendCommand = useCallback((cmd: unknown) => {
    iframeRef.current?.contentWindow?.postMessage({ [SLIDE_CMD_TAG]: cmd }, "*");
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      const request = shellRef.current?.requestFullscreen();
      if (request) void request.catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | {
            [SLIDE_BRIDGE_TAG]?: boolean;
            index?: number;
            total?: number;
            overview?: boolean;
            marker?: boolean;
            fontScale?: number;
            close?: boolean;
            fullscreen?: boolean;
          }
        | undefined;
      if (!data || data[SLIDE_BRIDGE_TAG] !== true) return;
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      if (data.fullscreen === true) {
        toggleFullscreen();
        return;
      }
      if (data.close === true) {
        if (document.fullscreenElement) void document.exitFullscreen();
        else onCloseRef.current();
        return;
      }
      setState((prev) => ({
        ...prev,
        index: typeof data.index === "number" ? data.index : prev.index,
        total: typeof data.total === "number" ? data.total : prev.total,
        overview: data.overview === true,
        marker: data.marker === true,
        fontScale: typeof data.fontScale === "number" ? data.fontScale : prev.fontScale,
      }));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [toggleFullscreen]);

  // Lock background scrolling, move focus into the dialog, restore on close
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.fullscreenElement) return;
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      body.style.overflow = previousOverflow;
      if (document.fullscreenElement) void document.exitFullscreen();
      previouslyFocused?.focus?.();
    };
  }, []);

  // Trap Tab inside dialog
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

  const progress = state.total === 0 ? 0 : ((state.index + 1) / state.total) * 100;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Dialog panel — fullscreen target */}
      <div
        ref={(node) => {
          dialogRef.current = node;
          shellRef.current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Slides for ${snapshot.title}`}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="relative flex flex-1 flex-col overflow-hidden bg-card outline-none w-full h-full"
      >
        {/* Header toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card/60 px-4 py-2.5 sm:gap-3">
          <Presentation className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="hidden text-xs font-bold tracking-wider text-muted-foreground uppercase sm:inline">
            Slides
          </span>
          <span
            className="min-w-0 max-w-[160px] truncate text-sm font-semibold text-foreground sm:max-w-[240px]"
            title={snapshot.title}
          >
            {snapshot.title}
          </span>

          {/* Quick jump slide selector */}
          {state.total > 0 && (
            <select
              aria-label="Jump to slide"
              value={state.index}
              onChange={(e) => sendCommand({ type: "goTo", index: Number(e.target.value) })}
              className="h-7 shrink-0 rounded-md border border-border bg-background px-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Array.from({ length: state.total }, (_, i) => (
                <option key={i} value={i}>
                  Slide {i + 1} / {state.total}
                </option>
              ))}
            </select>
          )}

          <span className="flex-1" />

          {/* Font resize controls */}
          <div className="flex shrink-0 items-center rounded-md border border-border bg-background p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => sendCommand("decreaseFontSize")}
              disabled={!doc}
              aria-label="Decrease font size"
              title="Decrease font size (Press '-')"
              className="h-6 w-6 text-xs font-semibold"
            >
              A−
            </Button>
            <button
              type="button"
              onClick={() => sendCommand("resetFontSize")}
              disabled={!doc}
              title="Reset font size to 100% (Press '0')"
              className="px-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              {state.fontScale}%
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => sendCommand("increaseFontSize")}
              disabled={!doc}
              aria-label="Increase font size"
              title="Increase font size (Press '+')"
              className="h-6 w-6 text-xs font-semibold"
            >
              A+
            </Button>
          </div>

          {/* Temporary Marker button */}
          <Button
            type="button"
            variant={state.marker ? "secondary" : "outline"}
            size="sm"
            onClick={() => sendCommand("toggleMarker")}
            disabled={!doc}
            className="shrink-0 gap-1.5 text-xs"
            title="Temporary Marker: draw temporary ink that fades away after you finish drawing (Press 'M')"
          >
            <Highlighter className={`h-3.5 w-3.5 ${state.marker ? "text-red-500 fill-red-500/20" : ""}`} />
            <span>Marker</span>
            {state.marker && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </Button>

          {/* Theme selector */}
          <div className="flex shrink-0 items-center gap-1">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              aria-label="Slide theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as SlideTheme)}
              className="h-7 shrink-0 rounded-md border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {(Object.keys(SLIDE_THEMES) as SlideTheme[]).map((t) => (
                <option key={t} value={t}>
                  {SLIDE_THEMES[t].label}
                </option>
              ))}
            </select>
          </div>

          {/* Transition selector */}
          <div className="flex shrink-0 items-center gap-1">
            <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              aria-label="Slide transition"
              title="Slide transition style"
              value={transition}
              onChange={(e) => {
                const next = e.target.value as SlideTransition;
                setTransition(next);
                sendCommand({ type: "setTransition", transition: next });
              }}
              className="h-7 shrink-0 rounded-md border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SLIDE_TRANSITIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Separator slicing selector */}
          <select
            aria-label="Slide separators"
            title={SEPARATORS.find((s) => s.value === separator)?.hint}
            value={separator}
            onChange={(e) => setSeparator(e.target.value as SlideSeparator)}
            className="hidden h-7 shrink-0 rounded-md border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring lg:inline-block"
          >
            {SEPARATORS.map((s) => (
              <option key={s.value} value={s.value} title={s.hint}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Prev / Next buttons */}
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => sendCommand("prev")}
              disabled={!doc}
              aria-label="Previous slide"
              title="Previous slide (Left Arrow)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => sendCommand("next")}
              disabled={!doc}
              aria-label="Next slide"
              title="Next slide (Right Arrow / Space)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Overview button */}
          <Button
            type="button"
            variant={state.overview ? "secondary" : "outline"}
            size="sm"
            onClick={() => sendCommand("toggleOverview")}
            disabled={!doc}
            className="shrink-0 gap-1 text-xs"
            title="Slide overview grid (Press 'G')"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </Button>

          {/* Fullscreen button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            disabled={!doc}
            className="shrink-0 gap-1 text-xs"
            aria-label={isFullscreen ? "Exit fullscreen" : "Present fullscreen"}
            title="Toggle fullscreen (Press 'F')"
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Present"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close slides"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div
          className="h-1 shrink-0 bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={Math.max(state.total, 1)}
          aria-valuenow={state.total === 0 ? 1 : state.index + 1}
          aria-label="Slide progress"
        >
          <div
            className="h-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Deck area */}
        <div className="relative min-h-0 flex-1 bg-muted">
          {error ? (
            <div className="flex h-full items-center justify-center p-6">
              <p className="max-w-md rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                Could not build the slides: {error}
              </p>
            </div>
          ) : doc ? (
            <iframe
              ref={iframeRef}
              title={`Slides for ${snapshot.title}`}
              sandbox="allow-scripts allow-modals allow-popups-to-escape-sandbox"
              srcDoc={doc}
              tabIndex={-1}
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
              <Presentation className="h-4 w-4 animate-pulse" />
              Building slides…
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
