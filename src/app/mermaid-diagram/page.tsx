"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { exportMermaidSvg, exportMermaidImage } from "@/lib/mermaid-export";
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

const sampleMermaid = `graph TD
    A([Start]):::flow-start --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]:::flow-action
    D --> E[Check Logs]:::flow-action
    E --> B
    C --> F([Deploy]):::flow-start`;

const exportOptions = [
  { value: "svg", label: "SVG", icon: FileText },
  { value: "png", label: "PNG", icon: Image },
  { value: "jpg", label: "JPG", icon: FileImage },
] as const;

export default function MermaidDiagramPage() {
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

  const minZoom = 0.25;
  const maxZoom = 3;
  const zoomStep = 0.1;

  const updateZoom = useCallback((delta: number) => {
    setZoom((prev) =>
      Math.min(maxZoom, Math.max(minZoom, +(prev + delta).toFixed(3))),
    );
  }, []);

  const resetZoom = useCallback(() => setZoom(1), []);

  // Ctrl/Cmd + scroll (or trackpad pinch) zooms the preview.
  // Native non-passive listener is required because React registers
  // wheel events passively, which blocks preventDefault.
  useEffect(() => {
    const el = previewScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? 0.05 : 0.0015;
      updateZoom(-e.deltaY * step);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [updateZoom]);

  const renderDiagram = useCallback(async () => {
    if (!input.trim()) {
      setSvgCode("");
      setError(null);
      return;
    }

    setIsRendering(true);
    setError(null);

    try {
      mermaid.initialize(getMermaidConfig(diagramTheme));
      const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
      const { svg } = await mermaid.render(id, input);
      setSvgCode(svg);
    } catch (err) {
      setSvgCode("");
      setError(err instanceof Error ? err.message : "Failed to render diagram");
    } finally {
      setIsRendering(false);
    }
  }, [input, diagramTheme]);

  const handleThemeChange = (theme: DiagramTheme) => {
    setDiagramTheme(theme);
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

  return (
    <ToolPageLayout
      title="Mermaid Diagram"
      description="Write Mermaid syntax and preview or export diagrams."
    >
      <div className="h-full flex flex-col gap-4">
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Export &amp; Render</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Theme Selector */}
            <div className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground font-semibold">
                Theme:
              </span>
              <select
                value={diagramTheme}
                onChange={(e) =>
                  handleThemeChange(e.target.value as DiagramTheme)
                }
                className="h-7 px-2 pr-6 rounded border border-border bg-background text-[11px] font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-primary/40 transition-colors"
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
                      className="h-6 gap-1 px-2.5 rounded text-[10px] font-semibold"
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
              className="h-6 gap-1 px-3 text-[11px] font-semibold rounded shadow-none"
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
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-10">
          <div className="lg:col-span-3 flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Mermaid Code
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
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
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
                  <span className="text-[10px] font-mono font-semibold text-foreground w-10 text-center tabular-nums">
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

              {/* Preview Body — canvas color follows the selected theme */}
              <div
                ref={previewScrollRef}
                className="flex-1 relative overflow-auto p-4 min-h-0 transition-colors duration-200"
                style={{ backgroundColor: getThemeSpec(diagramTheme).canvas }}
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
                <div ref={previewRef} className="min-h-full min-w-fit flex">
                  <div
                    ref={zoomTargetRef}
                    className="m-auto transition-all duration-150 ease-out"
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
            accept=".mmd,.mermaid,.txt"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop your Mermaid file here, or click to browse"
          />
        )}

        {/* Status messages */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Diagram Error</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
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
              <span className="text-[11px] text-muted-foreground">
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
