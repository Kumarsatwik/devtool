"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { svgToReactComponent, SAMPLE_SVG, type SvgToReactOptions } from "@/lib/svg-to-react";
import {
  AlertCircle,
  CheckCircle2,
  Code,
  Copy,
  Check,
  Download,
  Eye,
  PenTool,
  RotateCcw,
  Settings,
} from "lucide-react";
import { saveAs } from "file-saver";

const DEFAULT_COMPONENT_NAME = "MyIcon";

export default function SvgToReactPage() {
  const [svgInput, setSvgInput] = useState(SAMPLE_SVG);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  const [componentName, setComponentName] = useState(DEFAULT_COMPONENT_NAME);
  const [typescript, setTypescript] = useState(true);
  const [forwardRef, setForwardRef] = useState(false);
  const [includeProps, setIncludeProps] = useState(true);
  const [exportStyle, setExportStyle] = useState<"default" | "named">("default");

  const options: SvgToReactOptions = useMemo(
    () => ({ componentName: componentName || DEFAULT_COMPONENT_NAME, typescript, forwardRef, exportStyle, includeProps }),
    [componentName, typescript, forwardRef, exportStyle, includeProps],
  );

  const handleConvert = useCallback(() => {
    if (!svgInput.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      const result = svgToReactComponent(svgInput, options);
      setOutput(result);
      setError(null);
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Failed to convert SVG.");
    }
  }, [svgInput, options]);

  useEffect(() => {
    handleConvert();
  }, [handleConvert]);

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const ext = typescript ? "tsx" : "jsx";
    const name = (componentName || DEFAULT_COMPONENT_NAME)
      .replace(/[^a-zA-Z0-9]/g, "")
      .replace(/^[a-z]/, (c) => c.toUpperCase());
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${name}.${ext}`);
  };

  const handleReset = () => {
    setSvgInput(SAMPLE_SVG);
    setComponentName(DEFAULT_COMPONENT_NAME);
    setTypescript(true);
    setForwardRef(false);
    setIncludeProps(true);
    setExportStyle("default");
  };

  const fileExtension = typescript ? "tsx" : "jsx";

  return (
    <ToolPageLayout
      title="SVG to React"
      description="Convert SVG markup into React components with TypeScript, forwardRef, and configurable props. Live preview included."
    >
      <div className="h-full flex flex-col gap-4">
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Options</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Component Name */}
            <label className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <span>Name:</span>
              <input
                type="text"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                placeholder={DEFAULT_COMPONENT_NAME}
                className="w-28 h-6 px-2 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </label>

            {/* TS / JS toggle */}
            <div className="flex border border-border rounded p-0.5 bg-background">
              <Button
                variant={typescript ? "secondary" : "ghost"}
                size="xs"
                className="h-6 px-2.5 rounded text-xs font-semibold"
                onClick={() => setTypescript(true)}
              >
                TS
              </Button>
              <Button
                variant={!typescript ? "secondary" : "ghost"}
                size="xs"
                className="h-6 px-2.5 rounded text-xs font-semibold"
                onClick={() => setTypescript(false)}
              >
                JS
              </Button>
            </div>

            {/* Export style */}
            <div className="flex border border-border rounded p-0.5 bg-background">
              <Button
                variant={exportStyle === "default" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 px-2.5 rounded text-xs font-semibold"
                onClick={() => setExportStyle("default")}
              >
                Default
              </Button>
              <Button
                variant={exportStyle === "named" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 px-2.5 rounded text-xs font-semibold"
                onClick={() => setExportStyle("named")}
              >
                Named
              </Button>
            </div>

            {/* forwardRef toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={forwardRef}
                onChange={(e) => setForwardRef(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>forwardRef</span>
            </label>

            {/* Include props toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={includeProps}
                onChange={(e) => setIncludeProps(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Props (size, title)</span>
            </label>

            {/* Reset */}
            <Button
              variant="ghost"
              size="xs"
              className="h-6 gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              onClick={handleReset}
              title="Reset to sample SVG"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-2">
          {/* SVG Input */}
          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              SVG Input
            </label>
            <EditorPanel
              value={svgInput}
              onChange={setSvgInput}
              language="html"
              title="SVG"
              sampleText={SAMPLE_SVG}
              downloadFileName="icon.svg"
              accept=".svg"
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>

          {/* Output */}
          <div className="flex flex-col min-h-0 gap-2">
            <div className="flex items-center justify-between shrink-0">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Output
              </label>
              <div className="flex items-center gap-1.5">
                {/* Tab switcher */}
                <div className="flex border border-border rounded p-0.5 bg-background">
                  <Button
                    variant={activeTab === "preview" ? "secondary" : "ghost"}
                    size="xs"
                    className="h-6 gap-1 px-2.5 rounded text-xs font-semibold"
                    onClick={() => setActiveTab("preview")}
                  >
                    <Eye className="h-3 w-3" />
                    <span>Preview</span>
                  </Button>
                  <Button
                    variant={activeTab === "code" ? "secondary" : "ghost"}
                    size="xs"
                    className="h-6 gap-1 px-2.5 rounded text-xs font-semibold"
                    onClick={() => setActiveTab("code")}
                  >
                    <Code className="h-3 w-3" />
                    <span>Code</span>
                  </Button>
                </div>

                {/* Copy */}
                {output && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    onClick={handleCopy}
                    title="Copy component code"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </Button>
                )}

                {/* Download */}
                {output && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    onClick={handleDownload}
                    title={`Download as .${fileExtension}`}
                  >
                    <Download className="h-3 w-3" />
                    <span>.{fileExtension}</span>
                  </Button>
                )}
              </div>
            </div>

            {activeTab === "preview" ? (
              <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card hover:border-border transition-colors duration-200 flex-1 min-h-0">
                {/* Preview header */}
                <div className="flex items-center justify-between bg-muted/40 border-b border-border/85 px-3 py-1.5 text-xs select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold text-foreground">SVG Preview</span>
                  </div>
                </div>

                {/* Preview body */}
                <div className="flex-1 min-h-0 flex items-center justify-center p-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23e4e4e7%22%20opacity%3D%220.3%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23e4e4e7%22%20opacity%3D%220.3%22%2F%3E%3C%2Fsvg%3E')] overflow-auto">
                  {svgInput.trim() && !error ? (
                    <div
                      className="max-w-full max-h-full [&>svg]:w-48 [&>svg]:h-48"
                      dangerouslySetInnerHTML={{ __html: cleanSvgForPreview(svgInput) }}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground text-center">
                      <PenTool className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>Paste SVG on the left to see a preview</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EditorPanel
                value={output}
                language={typescript ? "typescript" : "javascript"}
                readOnly
                title={componentName || DEFAULT_COMPONENT_NAME}
                downloadFileName={`${(componentName || DEFAULT_COMPONENT_NAME).replace(/[^a-zA-Z0-9]/g, "")}.${fileExtension}`}
                height="fill"
                className="flex-1 min-h-0"
              />
            )}
          </div>
        </div>

        {/* File Upload */}
        {!svgInput && (
          <FileUpload
            accept=".svg"
            onFileLoaded={(content) => setSvgInput(content)}
            label="Drag and drop an SVG file here, or click to browse"
          />
        )}

        {/* Error */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Conversion Error</p>
              <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {/* Success */}
        {svgInput && output && !error && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <span className="font-semibold text-foreground">
              Component <code className="text-[11px] bg-muted/60 px-1 py-0.5 rounded">{componentName || DEFAULT_COMPONENT_NAME}</code> generated ({typescript ? "TypeScript" : "JavaScript"}, {exportStyle} export{forwardRef ? ", forwardRef" : ""})
            </span>
          </StatusMessage>
        )}
      </div>
    </ToolPageLayout>
  );
}

function cleanSvgForPreview(svg: string): string {
  return svg
    .replace(/<\?xml[^?]*\?>\s*/gi, "")
    .replace(/<!DOCTYPE[^>]*>\s*/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}
