"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout } from "@/components/tool-page-layout";
import { SplitDivider, useSplitResize } from "@/components/resizable-split";
import { buildDocument } from "@/lib/html-playground";
import {
  AlertTriangle,
  Braces,
  Download,
  Copy,
  Check,
  Eraser,
  FileCode2,
  Info,
  MonitorPlay,
  Palette,
  Play,
  RotateCcw,
  Terminal,
  XCircle,
} from "lucide-react";

type PaneId = "html" | "css" | "js";
type ConsoleLevel = "log" | "info" | "warn" | "error";

interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  text: string;
}

const SAMPLE_HTML = `<div class="card">
  <h1>Hello, DataTools</h1>
  <p>Edit the HTML, CSS or JS — the sandboxed preview updates live.</p>
  <button id="ping">Click me</button>
  <ul id="clicks"></ul>
</div>`;

const SAMPLE_CSS = `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: #f4f4f5;
}

.card {
  background: white;
  padding: 2rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  text-align: center;
}

button {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: #18181b;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
}

button:hover { opacity: 0.85; }

ul { list-style: none; padding: 0; font-size: 0.8rem; color: #555; }`;

const SAMPLE_JS = `const button = document.getElementById("ping");
const list = document.getElementById("clicks");
let clicks = 0;

button.addEventListener("click", () => {
  clicks += 1;
  const item = document.createElement("li");
  item.textContent = "Click #" + clicks + " at " + new Date().toLocaleTimeString();
  list.appendChild(item);
  console.log("Button clicked", { clicks });
});

console.info("Playground ready — open the console to see output.");`;

const PANES: {
  id: PaneId;
  label: string;
  language: string;
  icon: LucideIcon;
  sample: string;
  downloadName: string;
}[] = [
  { id: "html", label: "HTML", language: "html", icon: FileCode2, sample: SAMPLE_HTML, downloadName: "index.html" },
  { id: "css", label: "CSS", language: "css", icon: Palette, sample: SAMPLE_CSS, downloadName: "styles.css" },
  { id: "js", label: "JS", language: "javascript", icon: Braces, sample: SAMPLE_JS, downloadName: "script.js" },
];


const MAX_CONSOLE_ENTRIES = 200;
const AUTORUN_DELAY_MS = 400;

const LEVEL_STYLES: Record<ConsoleLevel, { icon: LucideIcon; className: string }> = {
  log: { icon: Info, className: "text-foreground/80" },
  info: { icon: Info, className: "text-foreground/80" },
  warn: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400" },
  error: { icon: XCircle, className: "text-destructive" },
};

export default function HtmlPlaygroundPage() {
  const [panes, setPanes] = useState<Record<PaneId, string>>({
    html: SAMPLE_HTML,
    css: SAMPLE_CSS,
    js: SAMPLE_JS,
  });
  const [activePane, setActivePane] = useState<PaneId>("html");
  const [autoRun, setAutoRun] = useState(true);
  const [srcDoc, setSrcDoc] = useState(() => buildDocument(SAMPLE_HTML, SAMPLE_CSS, SAMPLE_JS, true));
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [consoleCopied, setConsoleCopied] = useState(false);
  const [outputView, setOutputView] = useState<"preview" | "console">("preview");

  const { isResizing, containerRef, dividerProps, containerStyle } = useSplitResize();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consoleScrollRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);

  const run = useCallback((next: Record<PaneId, string>) => {
    setConsoleEntries([]);
    setSrcDoc(buildDocument(next.html, next.css, next.js, true));
  }, []);

  // Debounced live compilation
  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(() => run(panes), AUTORUN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [panes, autoRun, run]);

  // Receive console output and runtime errors from the sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as
        | { __htmlPlayground?: boolean; level?: ConsoleLevel; args?: string[] }
        | undefined;
      if (!data || data.__htmlPlayground !== true) return;
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;

      const text = Array.isArray(data.args) ? data.args.join(" ") : String(data.args ?? "");
      const level: ConsoleLevel =
        data.level === "info" || data.level === "warn" || data.level === "error" ? data.level : "log";

      setConsoleEntries((prev) => {
        const next = [...prev, { id: entryIdRef.current++, level, text }];
        return next.length > MAX_CONSOLE_ENTRIES ? next.slice(next.length - MAX_CONSOLE_ENTRIES) : next;
      });
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Keep the console pinned to the latest output
  useEffect(() => {
    const el = consoleScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [consoleEntries]);

  const handlePaneChange = (id: PaneId) => (value: string) => {
    setPanes((prev) => ({ ...prev, [id]: value }));
  };

  const handleReset = () => {
    setPanes({ html: SAMPLE_HTML, css: SAMPLE_CSS, js: SAMPLE_JS });
    setConsoleEntries([]);
    if (!autoRun) run({ html: SAMPLE_HTML, css: SAMPLE_CSS, js: SAMPLE_JS });
  };

  const handleDownload = () => {
    const blob = new Blob([buildDocument(panes.html, panes.css, panes.js, false)], {
      type: "text/html;charset=utf-8",
    });
    saveAs(blob, "playground.html");
  };

  const handleCopyConsole = async () => {
    if (consoleEntries.length === 0) return;
    const text = consoleEntries.map((e) => `[${e.level}] ${e.text}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setConsoleCopied(true);
      setTimeout(() => setConsoleCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const pane = PANES.find((p) => p.id === activePane) ?? PANES[0];

  return (
    <ToolPageLayout
      title="HTML Playground"
      description="Write HTML, CSS, and JavaScript with a live origin-isolated preview and console. External fetches, forms, and popups are blocked by the preview policy."
    >
      <div className="h-full flex flex-col gap-4">
        {/* Sandbox Bar */}
        <div className="flex flex-wrap items-center justify-end gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">

          <div className="flex flex-wrap items-center gap-3">
            {/* Download standalone HTML */}
            <Button
              variant="ghost"
              size="xs"
              className="h-6 gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              onClick={handleDownload}
              title="Download compiled page as .html"
            >
              <Download className="h-3 w-3" />
              <span>Save HTML</span>
            </Button>

            {/* Restore sample project */}
            <Button
              variant="ghost"
              size="xs"
              className="h-6 gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              onClick={handleReset}
              title="Restore the sample project"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>

            {/* Live compile toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Live Compile</span>
            </label>

            {/* Manual run */}
            {!autoRun && (
              <Button
                onClick={() => run(panes)}
                size="xs"
                className="h-6 gap-1 px-3 text-xs font-semibold rounded shadow-none"
              >
                <Play className="h-3 w-3" />
                <span>Run</span>
              </Button>
            )}
          </div>
        </div>

        {/* Workspace — draggable split between code and output */}
        <div
          ref={containerRef}
          style={containerStyle}
          className={`flex-1 min-h-0 flex flex-col lg:flex-row gap-1 lg:gap-0 ${isResizing ? "select-none" : ""}`}
        >
          {/* Source Panes */}
          <div className="flex flex-col min-h-0 gap-2 flex-1 lg:flex-none w-full lg:w-[var(--split)] lg:shrink-0">
            <div className="flex items-center justify-between shrink-0">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Source Code
              </label>
              <div className="flex border border-border rounded p-0.5 bg-background">
                {PANES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={activePane === item.id ? "secondary" : "ghost"}
                      size="xs"
                      className="h-6 gap-1 px-2.5 rounded text-xs font-semibold"
                      onClick={() => setActivePane(item.id)}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <EditorPanel
              key={activePane}
              value={panes[activePane]}
              onChange={handlePaneChange(activePane)}
              language={pane.language}
              title=""
              sampleText={pane.sample}
              downloadFileName={pane.downloadName}
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>

          {/* Drag handle — resize code vs output width */}
          <SplitDivider
            dividerProps={dividerProps}
            isResizing={isResizing}
            label="Resize code and output panes"
          />

          {/* Output — full-height section, switch between Preview and Console */}
          <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card hover:border-border transition-colors duration-200 flex-1 min-h-0 min-w-0">
            <div className="flex items-center justify-between gap-2 bg-muted/40 border-b border-border/85 px-2 py-1.5 text-xs select-none shrink-0">
              <div className="flex items-center gap-1 p-0.5 rounded border border-border/50 bg-background">
                <Button
                  variant={outputView === "preview" ? "secondary" : "ghost"}
                  size="xs"
                  className="h-6 gap-1 px-2.5 rounded text-xs font-semibold"
                  onClick={() => setOutputView("preview")}
                  title="Show the sandboxed live preview"
                >
                  <MonitorPlay className="h-3 w-3" />
                  <span>Preview</span>
                </Button>
                <Button
                  variant={outputView === "console" ? "secondary" : "ghost"}
                  size="xs"
                  className="h-6 gap-1 px-2.5 rounded text-xs font-semibold"
                  onClick={() => setOutputView("console")}
                  title="Show the console output"
                >
                  <Terminal className="h-3 w-3" />
                  <span>Console</span>
                  {consoleEntries.length > 0 && (
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground bg-muted px-1.5 rounded border border-border/50">
                      {consoleEntries.length}
                    </span>
                  )}
                </Button>
              </div>

              {outputView === "preview" ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                  Sandbox
                </span>
              ) : (
                consoleEntries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      onClick={handleCopyConsole}
                      title="Copy console output"
                    >
                      {consoleCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{consoleCopied ? "Copied" : "Copy"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConsoleEntries([])}
                      title="Clear console"
                    >
                      <Eraser className="h-3 w-3" />
                      <span>Clear</span>
                    </Button>
                  </div>
                )
              )}
            </div>

            {/* Preview Body — kept mounted so switching views never re-runs the
                sandboxed code; isolated origin (scripts run, parent storage
                unreachable) plus a strict CSP blocks all external requests */}
            <div className={`flex-1 min-h-0 ${outputView === "preview" ? "" : "hidden"}`}>
              <iframe
                ref={iframeRef}
                title="HTML Preview"
                sandbox="allow-scripts allow-modals"
                srcDoc={srcDoc}
                className={`w-full h-full border-0 bg-white ${isResizing ? "pointer-events-none" : ""}`}
              />
            </div>

            {/* Console Body */}
            <div
              ref={consoleScrollRef}
              className={`flex-1 min-h-0 overflow-y-auto p-2.5 font-mono text-xs leading-relaxed space-y-1 ${
                outputView === "console" ? "" : "hidden"
              }`}
            >
              {consoleEntries.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-sans">
                  <span>Console output appears here…</span>
                </div>
              ) : (
                consoleEntries.map((entry) => {
                  const { icon: Icon, className } = LEVEL_STYLES[entry.level];
                  return (
                    <div key={entry.id} className={`flex items-start gap-1.5 ${className}`}>
                      <Icon className="h-3 w-3 mt-0.5 shrink-0 opacity-70" />
                      <span className="whitespace-pre-wrap break-words min-w-0">{entry.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
}
