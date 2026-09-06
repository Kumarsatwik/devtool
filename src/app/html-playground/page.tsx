"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout } from "@/components/tool-page-layout";
import {
  AlertTriangle,
  Braces,
  Download,
  Eraser,
  ExternalLink,
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

/**
 * Injected into the preview before user code. Relays console calls and
 * runtime errors back to the parent page via postMessage. Keep this free
 * of backticks and template placeholders — it ships as a plain string.
 */
const CONSOLE_BRIDGE = `<script>
(function () {
  var send = function (level, args) {
    try { parent.postMessage({ __htmlPlayground: true, level: level, args: args }, "*"); } catch (e) {}
  };
  var format = function (value, depth) {
    try {
      if (value instanceof Error) return value.stack || (value.name + ": " + value.message);
      if (typeof value === "function") return "[Function" + (value.name ? ": " + value.name : "") + "]";
      if (typeof value === "string") return value;
      if (value === undefined) return "undefined";
      if (value instanceof Element) return "<" + value.tagName.toLowerCase() + ">";
      if (depth > 3) return "…";
      return JSON.stringify(value, function (key, val) {
        if (typeof val === "function") return "[Function]";
        if (typeof val === "bigint") return String(val) + "n";
        return val;
      }, 2) || String(value);
    } catch (err) { return String(value); }
  };
  ["log", "info", "warn", "error", "debug"].forEach(function (method) {
    var original = console[method].bind(console);
    console[method] = function () {
      var args = Array.prototype.slice.call(arguments).map(function (v) { return format(v, 0); });
      send(method === "debug" ? "log" : method, args);
      original.apply(null, arguments);
    };
  });
  window.addEventListener("error", function (event) {
    send("error", [event.message + "  (" + (event.filename || "inline") + ":" + event.lineno + ":" + event.colno + ")"]);
  });
  window.addEventListener("unhandledrejection", function (event) {
    send("error", ["Unhandled promise rejection: " + format(event.reason, 0)]);
  });
})();
</script>`;

/**
 * Content-Security-Policy compiled into the preview/standalone document.
 * The iframe `sandbox` attribute isolates the origin and storage, but it does
 * NOT block network requests — this CSP denies every external fetch (scripts,
 * styles, images, fonts, XHR/WebSockets, form navigations). Inline code and
 * data:/blob: URLs stay allowed so normal playground code keeps working.
 */
const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data: blob:",
  "media-src data: blob:",
  "connect-src data: blob:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

function buildDocument(html: string, css: string, js: string, includeBridge: boolean): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}" />`,
    "<style>",
    css,
    "</style>",
    "</head>",
    "<body>",
    html,
    includeBridge ? CONSOLE_BRIDGE : "",
    "<script>",
    js,
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

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

  const handleOpenInNewTab = () => {
    const blob = new Blob([buildDocument(panes.html, panes.css, panes.js, false)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const pane = PANES.find((p) => p.id === activePane) ?? PANES[0];

  return (
    <ToolPageLayout
      title="HTML Playground"
      description="Write HTML, CSS, and JavaScript with a live sandboxed preview and console. All network access is blocked inside the preview."
    >
      <div className="h-full flex flex-col gap-4">
        {/* Sandbox Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <MonitorPlay className="h-4 w-4 text-muted-foreground" />
            <span>Sandbox Compiler</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Open standalone build in a new tab */}
            <Button
              variant="ghost"
              size="xs"
              className="h-6 gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              onClick={handleOpenInNewTab}
              title="Open compiled page in a new tab"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open</span>
            </Button>

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

        {/* Workspace — 50% code / 50% output */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-2">
          {/* Source Panes */}
          <div className="flex flex-col min-h-0 gap-2">
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

          {/* Preview + Console */}
          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Output
            </label>

            <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card hover:border-border transition-colors duration-200 flex-1 min-h-0">
              {/* Preview Header */}
              <div className="flex items-center justify-between bg-muted/40 border-b border-border/85 px-3 py-1.5 text-xs select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Preview</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                    Sandbox
                  </span>
                </div>
              </div>

              {/* Preview Body — isolated origin (scripts run, parent storage unreachable),
                  plus a strict CSP so no external network requests are possible */}
              <iframe
                ref={iframeRef}
                title="HTML Preview"
                sandbox="allow-scripts allow-modals allow-forms allow-popups"
                srcDoc={srcDoc}
                className="flex-1 w-full border-0 bg-white"
              />
            </div>

            <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card hover:border-border transition-colors duration-200 h-40 shrink-0">
              {/* Console Header */}
              <div className="flex items-center justify-between bg-muted/40 border-b border-border/85 px-3 py-1.5 text-xs select-none shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold text-foreground">Console</span>
                  {consoleEntries.length > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                      {consoleEntries.length}
                    </span>
                  )}
                </div>
                {consoleEntries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    onClick={() => setConsoleEntries([])}
                    title="Clear console"
                  >
                    <Eraser className="h-3 w-3" />
                    <span>Clear</span>
                  </Button>
                )}
              </div>

              {/* Console Body */}
              <div
                ref={consoleScrollRef}
                className="flex-1 min-h-0 overflow-y-auto p-2.5 font-mono text-xs leading-relaxed space-y-1"
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
      </div>
    </ToolPageLayout>
  );
}
