"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout } from "@/components/shell/tool-page-layout";
import { StatusMessage } from "@/components/status-message";
import { ResizableSplit } from "@/components/resizable-split";
import { FileUpload } from "@/components/file-upload";
import {
  copyMermaidImage,
  exportMermaidSvg,
  exportMermaidImage,
} from "@/lib/mermaid/export";
import { renderMermaidSvg } from "@/lib/mermaid/render";
import {
  diagramThemes,
  defaultDiagramTheme,
  getMermaidConfig,
  getThemeSpec,
  type DiagramTheme,
} from "@/lib/mermaid/themes";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileImage,
  FileText,
  Image,
  Palette,
  RefreshCw,
  Wand2,
  Settings2,
  RotateCcw,
  Minus,
  Plus,
  Maximize,
  Minimize,
} from "lucide-react";

const sampleMermaid = `flowchart LR
    Client([Web Client]) -->|POST /orders| Gateway[API Gateway]
    Gateway -->|validate token| Auth[Auth Service]
    Auth -->|authorized request| Orders[Order Service]
    Orders -->|save order| Database[(Orders DB)]
    Orders -->|publish order.created| Queue[(Message Queue)]
    Queue -->|send confirmation| Worker[Email Worker]`;

const exportOptions = [
  { value: "svg", label: "SVG", icon: FileText },
  { value: "png", label: "PNG", icon: Image },
  { value: "jpg", label: "JPG", icon: FileImage },
] as const;

export default function MermaidDiagramPage() {
  const [input, setInput] = useState(sampleMermaid);
  const [exportFormat, setExportFormat] =
    useState<(typeof exportOptions)[number]["value"]>("svg");
  const [copied, setCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [autoRender, setAutoRender] = useState(true);
  const [diagramTheme, setDiagramTheme] =
    useState<DiagramTheme>(defaultDiagramTheme);
  const [svgCode, setSvgCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const copyResetTimerRef = useRef<number | null>(null);
  const renderIdRef = useRef(0);
  const pendingZoomAnchorRef = useRef<{
    fx: number;
    fy: number;
    x: number;
    y: number;
  } | null>(null);

  const minZoom = 0.1;
  const maxZoom = 8;
  const zoomStep = 0.25;

  // Applies a new zoom. When an anchor (cursor point) is given, the content
  // under that point stays put: the scroll offset is corrected in the layout
  // effect below, once the zoomed layout has been committed.
  const commitZoom = useCallback(
    (next: number, anchor?: { x: number; y: number }) => {
      const clamped = Math.min(maxZoom, Math.max(minZoom, +next.toFixed(3)));
      if (clamped === zoomRef.current) return;

      if (anchor) {
        const rect = zoomTargetRef.current?.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          pendingZoomAnchorRef.current = {
            fx: (anchor.x - rect.left) / rect.width,
            fy: (anchor.y - rect.top) / rect.height,
            x: anchor.x,
            y: anchor.y,
          };
        }
      }

      zoomRef.current = clamped;
      setZoom(clamped);
    },
    [],
  );

  const updateZoom = useCallback(
    (delta: number) => commitZoom(zoomRef.current + delta),
    [commitZoom],
  );

  const resetZoom = useCallback(() => commitZoom(1), [commitZoom]);

  useLayoutEffect(() => {
    const anchor = pendingZoomAnchorRef.current;
    pendingZoomAnchorRef.current = null;
    const el = previewScrollRef.current;
    const target = zoomTargetRef.current;
    if (!anchor || !el || !target) return;

    const rect = target.getBoundingClientRect();
    el.scrollLeft += rect.left + anchor.fx * rect.width - anchor.x;
    el.scrollTop += rect.top + anchor.fy * rect.height - anchor.y;
  }, [zoom]);

  // Fit the rendered diagram to the available canvas width. The CSS zoom is a
  // user multiplier on top of this fit.
  useLayoutEffect(() => {
    const container = previewScrollRef.current;
    const svg = zoomTargetRef.current?.querySelector("svg");
    if (!container || !svg) return;
    const fitDiagram = () => {
      const viewBox = svg.getAttribute("viewBox");
      if (!viewBox) return;
      const parts = viewBox.split(/\s+/).map(Number);
      if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return;
      const [, , viewBoxWidth, viewBoxHeight] = parts;
      if (viewBoxWidth <= 0 || viewBoxHeight <= 0) return;
      const canvasWidth = Math.max(160, container.clientWidth - 32);
      const canvasHeight = Math.max(160, container.clientHeight - 32);
      const fitWidth = previewFullscreen
        ? Math.min(canvasWidth, canvasHeight * (viewBoxWidth / viewBoxHeight))
        : canvasWidth;
      svg.style.width = `${fitWidth}px`;
      svg.style.height = `${fitWidth * (viewBoxHeight / viewBoxWidth)}px`;
    };
    fitDiagram();
    const frameId = requestAnimationFrame(fitDiagram);
    const observer = new ResizeObserver(fitDiagram);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [svgCode, previewFullscreen]);

  useEffect(() => {
    if (!previewFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewFullscreen]);

  // Ctrl/Cmd + scroll (or trackpad pinch) zooms the preview around the cursor.
  // Native non-passive listener is required because React registers
  // wheel events passively, which blocks preventDefault.
  useEffect(() => {
    const el = previewScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? 0.1 : 0.003;
      commitZoom(zoomRef.current - e.deltaY * step, {
        x: e.clientX,
        y: e.clientY,
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [commitZoom]);

  const renderDiagram = useCallback(async () => {
    if (!input.trim()) {
      setSvgCode("");
      setError(null);
      return;
    }

    const renderId = ++renderIdRef.current;
    setIsRendering(true);
    setError(null);

    try {
      const svg = await renderMermaidSvg(input, getMermaidConfig(diagramTheme));
      if (renderId !== renderIdRef.current) return;
      setSvgCode(svg);
      setError(null);
    } catch (err) {
      if (renderId !== renderIdRef.current) return;
      setSvgCode("");
      setError(
        err instanceof Error ? err.message : "Failed to render diagram",
      );
    } finally {
      if (renderId === renderIdRef.current) setIsRendering(false);
    }
  }, [input, diagramTheme]);

  useEffect(() => {
    if (autoRender) {
      const timer = setTimeout(() => {
        renderDiagram();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [input, autoRender, renderDiagram]);

  const handleExport = async () => {
    if (!previewRef.current || !svgCode) return;

    try {
      setError(null);
      switch (exportFormat) {
        case "svg":
          await exportMermaidSvg(previewRef.current, "diagram.svg");
          break;
        case "png":
          await exportMermaidImage(previewRef.current, "png", "diagram.png");
          break;
        case "jpg":
          await exportMermaidImage(previewRef.current, "jpg", "diagram.jpg");
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleCopy = async () => {
    if (!previewRef.current || !svgCode) return;

    try {
      setError(null);
      await copyMermaidImage(previewRef.current);
      setCopied(true);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        copyResetTimerRef.current = null;
        setCopied(false);
      }, 2000);
    } catch (err) {
      setCopied(false);
      setError(
        err instanceof Error ? err.message : "Could not copy the diagram image",
      );
    }
  };

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  return (
    <ToolPageLayout
      title="Mermaid Diagram"
      description="Write Mermaid syntax, preview diagrams, and export as images."
    >
      <div className="h-full flex flex-col gap-4">
        <style>{`
          .mermaid-zoom-target svg {
            max-width: none !important;
          }
        `}</style>
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border/80 bg-card/90 p-3.5 rounded-xl text-xs select-none shadow-sm shrink-0">
          <div className="flex items-center gap-2.5 font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Settings2 className="h-4 w-4" />
            </span>
            <span>Diagram settings</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground font-semibold">
                Canvas
              </span>
              <select
                value={diagramTheme}
                onChange={(e) =>
                  setDiagramTheme(e.target.value as DiagramTheme)
                }
                aria-label="Diagram canvas theme"
                className="h-8 px-2.5 pr-7 rounded-lg border border-border bg-background text-xs font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-primary/40 transition-colors"
              >
                {diagramThemes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Format Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">
                Format:
              </span>
              <div className="flex border border-border rounded-lg p-0.5 bg-background">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={
                        exportFormat === option.value ? "secondary" : "ghost"
                      }
                      size="xs"
                      className="h-7 gap-1.5 px-2.5 rounded-md text-xs font-semibold"
                      onClick={() => setExportFormat(option.value)}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Export & Copy Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                onClick={handleExport}
                size="xs"
                className="h-8 gap-1.5 px-3.5 text-xs font-semibold rounded-lg shadow-none"
                disabled={!svgCode}
              >
                <Download className="h-3 w-3" />
                <span>Export</span>
              </Button>
              <Button
                onClick={handleCopy}
                size="xs"
                variant="outline"
                className="h-8 gap-1.5 px-3.5 text-xs font-semibold rounded-lg shadow-none"
                disabled={!svgCode}
                title="Copy the diagram image to your clipboard"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copied ? "Copied" : "Copy image"}</span>
              </Button>
            </div>

            {/* Auto render toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={autoRender}
                onChange={(e) => setAutoRender(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Live Preview</span>
            </label>
          </div>
        </div>

        {/* Editor workspace — resizable source and width-fitted preview */}
        <ResizableSplit
          label="Resize Mermaid code and diagram preview"
          initialPercent={30}
          first={
            <>
              <label className="flex items-center justify-between text-xs font-semibold text-foreground shrink-0 px-0.5">
                <span>Source</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  .mmd
                </span>
              </label>
              <EditorPanel
                value={input}
                onChange={setInput}
                language="mermaid"
                title=""
                sampleText={sampleMermaid}
                downloadFileName="diagram.mmd"
                downloadExtension="mmd"
                height="fill"
                className="flex-1 min-h-0"
              />
            </>
          }
          second={
            <>
              {!previewFullscreen && <label className="flex items-center justify-between text-xs font-semibold text-foreground shrink-0 px-0.5">
                <span>Live canvas</span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  ⌘/Ctrl + scroll to zoom
                </span>
              </label>}
              <div
                className={`flex flex-col border border-border/80 overflow-hidden bg-card transition-colors duration-200 min-h-0 ${previewFullscreen ? "fixed inset-0 z-50 h-[100dvh] w-screen rounded-none border-0 shadow-none" : "flex-1 rounded-xl shadow-sm hover:border-border"}`}
              >
                {/* Preview Header */}
                <div className="flex items-center justify-between bg-muted/35 border-b border-border/85 px-3.5 py-2 text-xs select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      Rendered diagram
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/70">
                      SVG
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-7 gap-1.5 rounded-md px-2 text-xs"
                      onClick={() => setPreviewFullscreen((value) => !value)}
                      aria-label={previewFullscreen ? "Exit fullscreen preview" : "Open fullscreen preview"}
                      title={previewFullscreen ? "Exit fullscreen (Esc)" : "Open fullscreen preview"}
                    >
                      {previewFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                      <span>{previewFullscreen ? "Exit full screen" : "Full screen"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      onClick={() => updateZoom(-zoomStep)}
                      disabled={zoom <= minZoom}
                      title="Zoom out"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-mono font-semibold text-foreground w-10 text-center tabular-nums">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      onClick={() => updateZoom(zoomStep)}
                      disabled={zoom >= maxZoom}
                      title="Zoom in"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    {zoom !== 1 && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        onClick={resetZoom}
                        title="Fit to width"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                    {!autoRender && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 ml-2"
                        onClick={renderDiagram}
                        disabled={isRendering}
                      >
                        {isRendering ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        <span>Render</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preview body follows the selected Mermaid theme. */}
                <div
                  ref={previewScrollRef}
                  className="flex-1 relative overflow-auto p-4 min-h-0 transition-colors duration-200"
                  style={{
                    backgroundColor: getThemeSpec(diagramTheme).canvas,
                    backgroundImage: `radial-gradient(${getThemeSpec(diagramTheme).dark ? "#FFFFFF12" : "#24372B12"} 0.75px, transparent 0.75px)`,
                    backgroundSize: "18px 18px",
                  }}
                  title="Ctrl/⌘ + scroll to zoom"
                >
                  {isRendering && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background/80 z-10">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      <span>Rendering diagram...</span>
                    </div>
                  )}

                  {!svgCode && !error && !isRendering && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      <span>Enter Mermaid code to see the preview</span>
                    </div>
                  )}

                  {/* CSS zoom (not transform) so the scroll area grows with the
                    diagram; m-auto centers when small yet keeps every edge
                    reachable when zoomed past the viewport */}
                  <div
                    ref={previewRef}
                    className="min-h-full min-w-fit flex"
                  >
                    <div
                      ref={zoomTargetRef}
                      className="m-auto mermaid-zoom-target"
                      style={{ zoom }}
                      dangerouslySetInnerHTML={{ __html: svgCode }}
                    />
                  </div>
                </div>
              </div>
            </>
          }
        />

        {/* File drop zone if empty */}
        {!input && (
          <FileUpload
            accept=".mmd,.mermaid,.txt"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop a Mermaid file here, or click to browse"
          />
        )}

        {/* Status messages */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Diagram Error</p>
              <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {svgCode && !error && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="font-semibold text-foreground">
                Diagram rendered successfully.
              </span>
              <span className="text-xs text-muted-foreground">
                Code length:{" "}
                <strong className="text-foreground">{input.length}</strong>
              </span>
            </div>
          </StatusMessage>
        )}
      </div>
    </ToolPageLayout>
  );
}
