"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { useTheme } from "@/components/theme-provider";
import { sortJSONValue, validateJSON } from "@/lib/json";
import {
  CheckCircle2,
  Edit3,
  Eye,
  Columns,
  Rows,
  Settings2,
  Trash2,
  ArrowDownAZ,
} from "lucide-react";

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  { ssr: false },
);

const sampleJSON1 = `{
  "name": "DataTools Platform",
  "version": "1.0.0",
  "engine": "v8",
  "modules": ["CSV-JSON", "Linter", "DiffEditor"],
  "environment": {
    "host": "localhost",
    "port": 3000
  },
  "isStable": true
}`;

const sampleJSON2 = `{
  "name": "DataTools Platform",
  "version": "1.1.0",
  "engine": "v8-turbo",
  "modules": ["CSV-JSON", "Linter", "DiffEditor", "YAML-Converter"],
  "environment": {
    "host": "127.0.0.1",
    "port": 3000,
    "ssl": false
  },
  "isStable": false
}`;

/**
 * @monaco-editor/react disposes the diff text models before the diff widget
 * on unmount, so monaco throws "TextModel got disposed before DiffEditorWidget
 * model got reset". keepCurrent* stops the library from touching the models;
 * we dispose them on a microtask, after the widget's own cleanup has run.
 */
function DiffWorkspace({
  original,
  modified,
  splitLayout,
}: {
  original: string;
  modified: string;
  splitLayout: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "vs-dark" : "vs-light";
  const modelsRef = useRef<editor.IDiffEditorModel | null>(null);

  useEffect(
    () => () => {
      const models = modelsRef.current;
      modelsRef.current = null;
      if (!models) return;
      queueMicrotask(() => {
        models.original.dispose();
        models.modified.dispose();
      });
    },
    [],
  );

  return (
    <MonacoDiffEditor
      original={original}
      modified={modified}
      language="json"
      theme={theme}
      height="100%"
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      onMount={(ed) => {
        modelsRef.current = ed.getModel();
      }}
      loading={
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
          Loading diff workspace...
        </div>
      }
      options={{
        renderSideBySide: splitLayout,
        renderGutterMenu: false,
        minimap: { enabled: false },
        readOnly: true,
        wordWrap: "on",
        fontSize: 13,
        scrollBeyondLastLine: false,
        fontFamily: "JetBrains Mono, Menlo, monospace",
      }}
    />
  );
}

export default function JSONComparePage() {
  const [input1, setInput1] = useState(sampleJSON1);
  const [input2, setInput2] = useState(sampleJSON2);

  // View options
  const [activeView, setActiveView] = useState<"edit" | "diff">("edit");
  const [splitLayout, setSplitLayout] = useState(true); // true = split, false = unified
  const [sortKeys, setSortKeys] = useState(false);

  const validation1 = useMemo(() => validateJSON(input1), [input1]);
  const validation2 = useMemo(() => validateJSON(input2), [input2]);

  const source1 = useMemo(
    () => (sortKeys && validation1.valid ? sortJSONValue(validation1.parsed) : input1),
    [sortKeys, input1, validation1],
  );
  const source2 = useMemo(
    () => (sortKeys && validation2.valid ? sortJSONValue(validation2.parsed) : input2),
    [sortKeys, input2, validation2],
  );

  const identical = source1 === source2;

  const handleClear = () => {
    setInput1("");
    setInput2("");
    setActiveView("edit");
    setSortKeys(false);
  };

  return (
    <ToolPageLayout
      title="JSON Compare"
      description="Perform GitHub-style side-by-side or unified comparisons between two JSON trees."
    >
      <div className="h-full flex flex-col gap-4">
        {/* Controls toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Workspace</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode (Edit Inputs vs View Diff) */}
            <div className="flex items-center border border-border rounded p-0.5 bg-background">
              <Button
                variant={activeView === "edit" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 gap-1 px-3 rounded text-xs font-semibold"
                onClick={() => setActiveView("edit")}
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit Code</span>
              </Button>
              <Button
                variant={activeView === "diff" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 gap-1 px-3 rounded text-xs font-semibold"
                onClick={() => setActiveView("diff")}
                disabled={!validation1.valid || !validation2.valid}
              >
                <Eye className="h-3 w-3" />
                <span>View Diff</span>
              </Button>
            </div>

            {/* Monaco layout configuration */}
            {activeView === "diff" && (
              <div className="flex items-center border border-border rounded p-0.5 bg-background">
                <Button
                  variant={splitLayout ? "secondary" : "ghost"}
                  size="xs"
                  className="h-6 gap-1 px-2.5 rounded text-xs font-semibold"
                  onClick={() => setSplitLayout(true)}
                >
                  <Columns className="h-3 w-3" />
                  <span>Split</span>
                </Button>
                <Button
                  variant={!splitLayout ? "secondary" : "ghost"}
                  size="xs"
                  className="h-6 gap-1 px-2.5 rounded text-xs font-semibold"
                  onClick={() => setSplitLayout(false)}
                >
                  <Rows className="h-3 w-3" />
                  <span>Unified</span>
                </Button>
              </div>
            )}

            {/* Sort keys toggle */}
            <Button
              variant={sortKeys ? "secondary" : "ghost"}
              size="xs"
              className="h-6 gap-1 text-xs font-semibold"
              aria-pressed={sortKeys}
              onClick={() => setSortKeys((v) => !v)}
              title="Sort keys alphabetically in both JSON files before comparing"
            >
              <ArrowDownAZ className="h-3 w-3" />
              <span>Sort Keys</span>
            </Button>

            <Button
              variant="ghost"
              size="xs"
              className="h-6 gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </Button>
          </div>
        </div>

        {activeView === "diff" && identical && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <span className="font-semibold">
              Documents are identical — no differences to display.
            </span>
          </StatusMessage>
        )}

        {sortKeys && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground select-none">
            <ArrowDownAZ className="h-3.5 w-3.5" />
            <span>
              Keys are sorted alphabetically (nested objects included) before
              comparison — original inputs are not modified.
            </span>
          </div>
        )}

        {/* Comparative workspace */}
        <div className="flex-1 min-h-0">
          {activeView === "edit" ? (
            <div className="h-full grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col min-h-0 gap-2">
                <div className="flex items-center justify-between text-xs select-none shrink-0">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground">
                    Original JSON (A)
                  </label>
                  <span
                    className={`font-semibold ${validation1.valid ? "text-muted-foreground" : "text-destructive"}`}
                  >
                    {validation1.valid ? "Valid Syntax" : "Invalid JSON"}
                  </span>
                </div>
                <EditorPanel
                  value={input1}
                  onChange={setInput1}
                  language="json"
                  title="JSON A"
                  sampleText={sampleJSON1}
                  height="fill"
                  className="flex-1 min-h-0"
                />
              </div>

              <div className="flex flex-col min-h-0 gap-2">
                <div className="flex items-center justify-between text-xs select-none shrink-0">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground">
                    Modified JSON (B)
                  </label>
                  <span
                    className={`font-semibold ${validation2.valid ? "text-muted-foreground" : "text-destructive"}`}
                  >
                    {validation2.valid ? "Valid Syntax" : "Invalid JSON"}
                  </span>
                </div>
                <EditorPanel
                  value={input2}
                  onChange={setInput2}
                  language="json"
                  title="JSON B"
                  sampleText={sampleJSON2}
                  height="fill"
                  className="flex-1 min-h-0"
                />
              </div>
            </div>
          ) : (
            /* Diff workspace: Monaco diff */
            <div className="h-full border border-border rounded overflow-hidden bg-card shadow-none flex flex-col min-h-0">
                <div className="bg-muted/40 border-b border-border px-3 py-1.5 text-xs text-muted-foreground flex justify-between select-none shrink-0">
                  <span>Code Comparison</span>
                  <span className="text-xs font-bold text-foreground">
                    GitHub-Style Diff View
                  </span>
                </div>
                <div className="flex-1 min-h-0 bg-background relative">
                  <DiffWorkspace
                    original={source1}
                    modified={source2}
                    splitLayout={splitLayout}
                  />
                </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
