"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { exportMarkdownHtml, MARKDOWN_CSS } from "@/lib/markdown-export";
import { saveAs } from "file-saver";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  FileCode2,
  RefreshCw,
  Wand2,
  Settings2,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";

const sampleMarkdown = `# Hello World

This is a **Markdown** preview.

## Features

- **Bold** and *italic* text
- [Links](https://example.com)
- \`inline code\`

### Code Block

\`\`\`javascript
console.log("Hello, world!");
\`\`\`

### Table

| Name  | Age |
|-------|-----|
| Alice | 25  |
| Bob   | 30  |

> Blockquote example

---

### Task List

- [x] Implement live preview
- [x] Add zoom controls
- [ ] Ship to production`;

const exportOptions = [
  { value: "md", label: ".md", icon: FileText },
  { value: "html", label: "HTML", icon: FileCode2 },
] as const;

function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const scripts = doc.querySelectorAll("script");
  scripts.forEach((s) => s.remove());
  return doc.body.innerHTML;
}

export default function MarkdownPreviewPage() {
  const [input, setInput] = useState(sampleMarkdown);
  const [htmlOutput, setHtmlOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<(typeof exportOptions)[number]["value"]>("html");
  const [isRendering, setIsRendering] = useState(false);
  const [autoRender, setAutoRender] = useState(true);
  const [zoom, setZoom] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  const minZoom = 0.25;
  const maxZoom = 3;
  const zoomStep = 0.1;

  const updateZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.min(maxZoom, Math.max(minZoom, +(prev + delta).toFixed(2))));
  }, []);

  const resetZoom = useCallback(() => setZoom(1), []);

  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  const renderMarkdown = useCallback(() => {
    if (!input.trim()) {
      setHtmlOutput("");
      setError(null);
      return;
    }

    setIsRendering(true);
    setError(null);

    try {
      const rawHtml = marked.parse(input, { async: false }) as string;
      const safeHtml = sanitizeHtml(rawHtml);
      setHtmlOutput(safeHtml);
    } catch (err) {
      setHtmlOutput("");
      setError(err instanceof Error ? err.message : "Failed to parse Markdown");
    } finally {
      setIsRendering(false);
    }
  }, [input]);

  useEffect(() => {
    if (autoRender) {
      const timer = setTimeout(() => renderMarkdown(), 200);
      return () => clearTimeout(timer);
    }
  }, [input, autoRender, renderMarkdown]);

  const handleExport = () => {
    if (!previewRef.current) return;

    try {
      setError(null);
      switch (exportFormat) {
        case "md":
          saveAs(new Blob([input], { type: "text/markdown;charset=utf-8" }), "document.md");
          break;
        case "html":
          exportMarkdownHtml(previewRef.current, "document.html");
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
    <ToolPageLayout title="Markdown Preview" description="Write Markdown syntax and preview rendered HTML.">
      <div className="h-full flex flex-col gap-4">
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Export &amp; Render</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Format:</span>
              <div className="flex border border-border rounded p-0.5 bg-background">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={exportFormat === option.value ? "secondary" : "ghost"}
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

            <Button
              onClick={handleExport}
              size="xs"
              className="h-6 gap-1 px-3 text-[11px] font-semibold rounded shadow-none"
              disabled={!htmlOutput && exportFormat !== "md"}
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </Button>

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
        <div className="flex-1 max-h-[calc(100vh-200px)] grid gap-4 lg:grid-cols-10 overflow-hidden">
          <div className="lg:col-span-3 flex flex-col gap-2 overflow-hidden">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Markdown
            </label>
            <EditorPanel
              value={input}
              onChange={setInput}
              language="plaintext"
              title="Markdown Input"
              sampleText={sampleMarkdown}
              downloadFileName="document.md"
              height="calc(100vh - 200px)"
              className="flex-1 min-h-0 overflow-hidden"
            />
          </div>

          <div className="lg:col-span-7 flex flex-col min-h-0 gap-2 overflow-hidden">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Preview
            </label>
            <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card hover:border-border transition-colors duration-200 flex-1 min-h-0">
              <div className="flex items-center justify-between bg-muted/40 border-b border-border/85 px-3 py-1.5 text-xs select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Preview</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                    HTML
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
                      onClick={renderMarkdown}
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

              {/* Preview Body */}
              <div className="flex-1 relative bg-background overflow-auto p-6 min-h-0">
                {isRendering && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background/80 z-10">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <span>Rendering...</span>
                  </div>
                )}

                {!htmlOutput && !error && !isRendering && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    <span>Enter Markdown code to see a live preview</span>
                  </div>
                )}

                <div ref={previewRef} className="min-h-full w-full">
                  <style>{MARKDOWN_CSS}</style>
                  <div
                    data-markdown-body
                    className="markdown-body transition-all duration-150 ease-out w-full"
                    style={{ zoom }}
                    dangerouslySetInnerHTML={{ __html: htmlOutput }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File drop zone if empty */}
        {!input && (
          <FileUpload
            accept=".md,.markdown,.txt"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop your Markdown file here, or click to browse"
          />
        )}

        {/* Status messages */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Render Error</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {htmlOutput && !error && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="font-semibold text-foreground">Markdown rendered successfully.</span>
              <span className="text-[11px] text-muted-foreground">
                Source length: <strong className="text-foreground">{input.length}</strong>
              </span>
            </div>
          </StatusMessage>
        )}
      </div>
    </ToolPageLayout>
  );
}
