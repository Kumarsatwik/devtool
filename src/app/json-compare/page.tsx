"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { useTheme } from "@/components/theme-provider";
import {
  compareJSON,
  sortJSONKeys,
  validateJSON,
  summarizeDiff,
  type DiffItem,
} from "@/lib/json";
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeftRight,
  Edit3,
  Eye,
  Columns,
  Rows,
  Settings2,
  Trash2,
  ArrowDownAZ,
  PlusCircle,
  MinusCircle,
  PencilLine,
  ListTree,
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

export default function JSONComparePage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const theme = mounted && resolvedTheme === "dark" ? "vs-dark" : "vs-light";

  const [input1, setInput1] = useState(sampleJSON1);
  const [input2, setInput2] = useState(sampleJSON2);
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // View options
  const [compared, setCompared] = useState(false);
  const [activeView, setActiveView] = useState<"edit" | "diff">("edit");
  const [splitLayout, setSplitLayout] = useState(true); // true = split, false = unified
  const [sortKeys, setSortKeys] = useState(false);

  const validation1 = validateJSON(input1);
  const validation2 = validateJSON(input2);

  const sortApplied1 = useMemo(() => {
    if (!sortKeys || !validation1.valid) return input1;
    try {
      return sortJSONKeys(input1);
    } catch {
      return input1;
    }
  }, [sortKeys, input1, validation1.valid]);

  const sortApplied2 = useMemo(() => {
    if (!sortKeys || !validation2.valid) return input2;
    try {
      return sortJSONKeys(input2);
    } catch {
      return input2;
    }
  }, [sortKeys, input2, validation2.valid]);

  const sortError = useMemo<string | null>(() => {
    if (!sortKeys) return null;
    if (!validation1.valid) return null;
    if (!validation2.valid) return null;
    try {
      sortJSONKeys(input1);
      sortJSONKeys(input2);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Failed to sort keys";
    }
  }, [sortKeys, input1, input2, validation1.valid, validation2.valid]);

  const handleCompare = useCallback(() => {
    try {
      setError(null);
      const source1 = sortKeys ? sortJSONKeys(input1) : input1;
      const source2 = sortKeys ? sortJSONKeys(input2) : input2;
      const result = compareJSON(source1, source2);
      setDiffs(result);
      setCompared(true);
      setActiveView("diff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
      setActiveView("edit");
    }
  }, [input1, input2, sortKeys]);

  const summary = useMemo(() => summarizeDiff(diffs), [diffs]);

  const handleClear = () => {
    setInput1("");
    setInput2("");
    setDiffs([]);
    setError(null);
    setCompared(false);
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
                className="h-6 gap-1 px-3 rounded text-[11px] font-semibold"
                onClick={() => setActiveView("edit")}
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit Code</span>
              </Button>
              <Button
                variant={activeView === "diff" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 gap-1 px-3 rounded text-[11px] font-semibold"
                onClick={handleCompare}
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
                  className="h-6 gap-1 px-2.5 rounded text-[10px] font-semibold"
                  onClick={() => setSplitLayout(true)}
                >
                  <Columns className="h-3 w-3" />
                  <span>Split</span>
                </Button>
                <Button
                  variant={!splitLayout ? "secondary" : "ghost"}
                  size="xs"
                  className="h-6 gap-1 px-2.5 rounded text-[10px] font-semibold"
                  onClick={() => setSplitLayout(false)}
                >
                  <Rows className="h-3 w-3" />
                  <span>Unified</span>
                </Button>
              </div>
            )}

            {/* Manual Run button */}
            {activeView === "edit" && (
              <Button
                onClick={handleCompare}
                size="xs"
                className="h-6 font-semibold"
                disabled={!validation1.valid || !validation2.valid}
              >
                <ArrowLeftRight className="h-3 w-3 mr-1" />
                Compare
              </Button>
            )}

            {/* Sort keys toggle */}
            <Button
              variant={sortKeys ? "secondary" : "ghost"}
              size="xs"
              className="h-6 gap-1 text-[11px] font-semibold"
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

        {/* Validation Errors */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">
                Comparison failed
              </p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                {error}
              </p>
            </div>
          </StatusMessage>
        )}

        {compared && !error && diffs.length === 0 && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <span className="font-semibold">
              Documents are syntactically identical. No diff paths found.
            </span>
          </StatusMessage>
        )}

        {sortKeys && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground select-none">
            <ArrowDownAZ className="h-3.5 w-3.5" />
            <span>
              Keys are sorted alphabetically (nested objects included) before
              comparison — original inputs are not modified.
            </span>
          </div>
        )}

        {sortError && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">
                Key sorting failed
              </p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                {sortError}
              </p>
            </div>
          </StatusMessage>
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
            /* Diff workspace: Monaco diff + change summary */
            <div className="h-full grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 border border-border rounded overflow-hidden bg-card shadow-none flex flex-col min-h-0">
                <div className="bg-muted/40 border-b border-border px-3 py-1.5 text-xs text-muted-foreground flex justify-between select-none shrink-0">
                  <span>Code Comparison</span>
                  <span className="text-[10px] font-bold text-foreground">
                    GitHub-Style Diff View
                  </span>
                </div>
                <div className="flex-1 min-h-0 bg-background relative">
                  {mounted ? (
                    <MonacoDiffEditor
                      original={sortApplied1}
                      modified={sortApplied2}
                      language="json"
                      theme={theme}
                      height="100%"
                      options={{
                        renderSideBySide: splitLayout,
                        minimap: { enabled: false },
                        readOnly: true,
                        wordWrap: "on",
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                        fontFamily: "JetBrains Mono, Menlo, monospace",
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      Loading diff workspace...
                    </div>
                  )}
                </div>
              </div>

              {/* Change summary */}
              <aside className="border border-border rounded overflow-hidden bg-card flex flex-col min-h-0">
                <div className="bg-muted/40 border-b border-border px-3 py-1.5 text-xs flex items-center justify-between select-none shrink-0">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <ListTree className="h-3.5 w-3.5 text-muted-foreground" />
                    Changes
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {summary.total} {summary.total === 1 ? "path" : "paths"}
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
                  {summary.total === 0 ? (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground border border-dashed border-border rounded p-3">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-foreground" />
                      <span>No structural differences found.</span>
                    </div>
                  ) : (
                    <>
                      {/* Counts */}
                      <div className="grid grid-cols-3 gap-1.5 text-center select-none">
                        <div className="border border-border rounded p-1.5 bg-background">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <PlusCircle className="h-3 w-3" />
                            <span>Added</span>
                          </div>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {summary.added}
                          </p>
                        </div>
                        <div className="border border-border rounded p-1.5 bg-background">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-destructive">
                            <MinusCircle className="h-3 w-3" />
                            <span>Removed</span>
                          </div>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {summary.removed}
                          </p>
                        </div>
                        <div className="border border-border rounded p-1.5 bg-background">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <PencilLine className="h-3 w-3" />
                            <span>Modified</span>
                          </div>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {summary.modified}
                          </p>
                        </div>
                      </div>

                      {/* Path list */}
                      <ul className="space-y-1">
                        {diffs.map((diff, i) => (
                          <li
                            key={`${diff.path}-${i}`}
                            className="group flex items-start gap-2 border border-border/70 rounded px-2 py-1.5 bg-background hover:bg-secondary/30 transition-colors"
                          >
                            <span
                              className="mt-0.5 shrink-0"
                              title={
                                diff.type === "added"
                                  ? "Added"
                                  : diff.type === "removed"
                                    ? "Removed"
                                    : "Modified"
                              }
                            >
                              {diff.type === "added" ? (
                                <PlusCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : diff.type === "removed" ? (
                                <MinusCircle className="h-3.5 w-3.5 text-destructive" />
                              ) : (
                                <PencilLine className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-[11px] font-semibold text-foreground break-all leading-snug">
                                {diff.path}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate leading-snug mt-0.5" title={formatDiffValue(diff.newValue ?? diff.oldValue)}>
                                {formatDiffValue(diff.newValue ?? diff.oldValue)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}

function formatDiffValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") {
    return value.length > 60 ? `${value.slice(0, 60)}…` : value;
  }
  try {
    const json = JSON.stringify(value);
    return json && json.length > 60 ? `${json.slice(0, 60)}…` : (json ?? "");
  } catch {
    return String(value);
  }
}
