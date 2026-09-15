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
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { exportMermaidSvg, exportMermaidImage } from "@/lib/mermaid-export";
import { fetchPlantUmlSvg, plantUmlBackground } from "@/lib/plantuml";
import {
  diagramThemes,
  defaultDiagramTheme,
  getMermaidConfig,
  getThemeSpec,
  type DiagramTheme,
} from "@/lib/mermaid-themes";
import {
  AlertCircle,
  CheckCircle2,
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
} from "lucide-react";

type DiagramEngine = "mermaid" | "plantuml";

const sampleMermaid = `graph TD
    A([Start]):::flow-start --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]:::flow-action
    D --> E[Check Logs]:::flow-action
    E --> B
    C --> F([Deploy]):::flow-start`;

const samplePlantUml = `@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml`;

const samples: Record<DiagramEngine, string> = {
  mermaid: sampleMermaid,
  plantuml: samplePlantUml,
};

const engines = [
  { value: "mermaid", label: "Mermaid" },
  { value: "plantuml", label: "PlantUML" },
] as const;

const exportOptions = [
  { value: "svg", label: "SVG", icon: FileText },
  { value: "png", label: "PNG", icon: Image },
  { value: "jpg", label: "JPG", icon: FileImage },
] as const;

export default function MermaidDiagramPage() {
  const [engine, setEngine] = useState<DiagramEngine>("mermaid");
  const [input, setInput] = useState(sampleMermaid);
  const [svgCode, setSvgCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] =
    useState<(typeof exportOptions)[number]["value"]>("svg");
  const [isRendering, setIsRendering] = useState(false);
  const [autoRender, setAutoRender] = useState(true);
  const [diagramTheme, setDiagramTheme] =
    useState<DiagramTheme>(defaultDiagramTheme);
  const [zoom, setZoom] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const renderIdRef = useRef(0);
  const pendingZoomAnchorRef = useRef<{
    fx: number;
    fy: number;
    x: number;
    y: number;
  } | null>(null);

  const minZoom = 0.25;
  const maxZoom = 3;
  const zoomStep = 0.1;

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

  // Ctrl/Cmd + scroll (or trackpad pinch) zooms the preview around the cursor.
  // Native non-passive listener is required because React registers
  // wheel events passively, which blocks preventDefault.
  useEffect(() => {
    const el = previewScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? 0.05 : 0.0015;
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
      if (engine === "plantuml") {
        // Rendered by the PlantUML server; the SVG is inlined so the
        // existing export path (and its same-origin canvas) keeps working.
        const svg = await fetchPlantUmlSvg(input);
        if (renderId === renderIdRef.current) setSvgCode(svg);
        return;
      }

      // lazy: mermaid is ~1MB; loaded on first render, then cached by the bundler
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize(getMermaidConfig(diagramTheme));
      const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
      const { svg } = await mermaid.render(id, input);
      if (renderId === renderIdRef.current) setSvgCode(svg);
    } catch (err) {
      if (renderId !== renderIdRef.current) return;
      setSvgCode("");
      setError(err instanceof Error ? err.message : "Failed to render diagram");
    } finally {
      if (renderId === renderIdRef.current) setIsRendering(false);
    }
  }, [input, diagramTheme, engine]);

  const handleEngineChange = (next: DiagramEngine) => {
    setEngine(next);
    setInput((prev) =>
      !prev.trim() || prev === samples[engine] ? samples[next] : prev,
    );
  };

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

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  const engineLabel = engine === "mermaid" ? "Mermaid" : "PlantUML";
  const ext = engine === "mermaid" ? "mmd" : "puml";

  return (
    <ToolPageLayout
      title="Mermaid & PlantUML Diagram"
      description="Write Mermaid or PlantUML syntax and preview or export diagrams."
    >
      <div className="h-full flex flex-col gap-4">
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Export &amp; Render</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Engine Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">
                Engine:
              </span>
              <div className="flex border border-border rounded p-0.5 bg-background">
                {engines.map((option) => (
                  <Button
                    key={option.value}
                    variant={engine === option.value ? "secondary" : "ghost"}
                    size="xs"
                    className="h-6 px-2.5 rounded text-xs font-semibold"
                    onClick={() => handleEngineChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Theme Selector (Mermaid only) */}
            {engine === "mermaid" && (
              <div className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground font-semibold">
                  Theme:
                </span>
                <select
                  value={diagramTheme}
                  onChange={(e) =>
                    setDiagramTheme(e.target.value as DiagramTheme)
                  }
                  className="h-7 px-2 pr-6 rounded border border-border bg-background text-xs font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-primary/40 transition-colors"
                >
                  {diagramThemes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Export Format Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">
                Format:
              </span>
              <div className="flex border border-border rounded p-0.5 bg-background">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={
                        exportFormat === option.value ? "secondary" : "ghost"
                      }
                      size="xs"
                      className="h-6 gap-1 px-2.5 rounded text-xs font-semibold"
                      onClick={() => setExportFormat(option.value)}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              size="xs"
              className="h-6 gap-1 px-3 text-xs font-semibold rounded shadow-none"
              disabled={!svgCode}
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </Button>

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

        {/* Editor workspace — 30% code / 70% preview */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-10 lg:grid-rows-1">
          <div className="lg:col-span-3 flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              {engineLabel} Code
            </label>
            <EditorPanel
              value={input}
              onChange={setInput}
              language={engine}
              title=""
              sampleText={samples[engine]}
              downloadFileName={`diagram.${ext}`}
              downloadExtension={ext}
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>

          <div className="lg:col-span-7 flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Diagram Preview
            </label>
            <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card hover:border-border transition-colors duration-200 flex-1 min-h-0">
              {/* Preview Header */}
              <div className="flex items-center justify-between bg-muted/40 border-b border-border/85 px-3 py-1.5 text-xs select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Preview</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                    SVG
                  </span>
                </div>
                <div className="flex items-center gap-1">
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
                      title="Reset zoom"
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

              {/* Preview Body — canvas color follows the selected theme;
                  PlantUML diagrams carry (or imply) their own background */}
              <div
                ref={previewScrollRef}
                className="flex-1 relative overflow-auto p-4 min-h-0 transition-colors duration-200"
                style={{
                  backgroundColor:
                    engine === "mermaid"
                      ? getThemeSpec(diagramTheme).canvas
                      : plantUmlBackground(svgCode),
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
                    <span>
                      Enter {engineLabel} code to see the preview
                    </span>
                  </div>
                )}

                {/* CSS zoom (not transform) so the scroll area grows with the
                    diagram; m-auto centers when small yet keeps every edge
                    reachable when zoomed past the viewport */}
                <div ref={previewRef} className="min-h-full min-w-fit flex">
                  <div
                    ref={zoomTargetRef}
                    className="m-auto"
                    style={{ zoom }}
                    dangerouslySetInnerHTML={{ __html: svgCode }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File drop zone if empty */}
        {!input && (
          <FileUpload
            accept={engine === "mermaid" ? ".mmd,.mermaid,.txt" : ".puml,.plantuml,.txt"}
            onFileLoaded={handleFileLoaded}
            label={`Drag and drop your ${engineLabel} file here, or click to browse`}
          />
        )}

        {/* Status messages */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Diagram Error</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {error}
              </p>
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
