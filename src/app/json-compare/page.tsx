"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { compareJSON, validateJSON, type DiffItem } from "@/lib/json";
import { 
  AlertCircle, 
  CheckCircle2, 
  Minus, 
  Plus, 
  ArrowLeftRight, 
  Edit3, 
  Eye, 
  Columns, 
  Rows,
  Search,
  Settings2,
  Trash2,
  GitPullRequest
} from "lucide-react";

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  { ssr: false }
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
  const [diffSearchQuery, setDiffSearchQuery] = useState("");
  const [diffFilterType, setDiffFilterType] = useState<"all" | "added" | "removed" | "modified">("all");

  const handleCompare = useCallback(() => {
    try {
      setError(null);
      const result = compareJSON(input1, input2);
      setDiffs(result);
      setCompared(true);
      setActiveView("diff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
      setActiveView("edit");
    }
  }, [input1, input2]);

  const handleClear = () => {
    setInput1("");
    setInput2("");
    setDiffs([]);
    setError(null);
    setCompared(false);
    setActiveView("edit");
  };

  const validation1 = validateJSON(input1);
  const validation2 = validateJSON(input2);

  // Compute counts for Summary Card
  const additionsCount = diffs.filter(d => d.type === "added").length;
  const deletionsCount = diffs.filter(d => d.type === "removed").length;
  const modificationsCount = diffs.filter(d => d.type === "modified").length;

  const filteredDiffs = diffs.filter((diff) => {
    const matchesSearch = diff.path.toLowerCase().includes(diffSearchQuery.toLowerCase()) ||
      JSON.stringify(diff.oldValue || "").toLowerCase().includes(diffSearchQuery.toLowerCase()) ||
      JSON.stringify(diff.newValue || "").toLowerCase().includes(diffSearchQuery.toLowerCase());
    
    const matchesType = diffFilterType === "all" || diff.type === diffFilterType;

    return matchesSearch && matchesType;
  });

  return (
    <ToolPageLayout title="JSON Compare" description="Perform GitHub-style side-by-side or unified comparisons between two JSON trees.">
      <div className="space-y-6">
        
        {/* Controls toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none">
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
              <p className="font-semibold text-destructive">Comparison failed</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {compared && !error && diffs.length === 0 && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <span className="font-semibold">Documents are syntactically identical. No diff paths found.</span>
          </StatusMessage>
        )}

        {/* Comparative workspace */}
        <div>
          {activeView === "edit" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs select-none">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground">Original JSON (A)</label>
                  <span className={`font-semibold ${validation1.valid ? "text-muted-foreground" : "text-destructive"}`}>
                    {validation1.valid ? "Valid Syntax" : "Invalid JSON"}
                  </span>
                </div>
                <EditorPanel
                  value={input1}
                  onChange={setInput1}
                  language="json"
                  title="JSON A"
                  sampleText={sampleJSON1}
                  height="480px"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs select-none">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground">Modified JSON (B)</label>
                  <span className={`font-semibold ${validation2.valid ? "text-muted-foreground" : "text-destructive"}`}>
                    {validation2.valid ? "Valid Syntax" : "Invalid JSON"}
                  </span>
                </div>
                <EditorPanel
                  value={input2}
                  onChange={setInput2}
                  language="json"
                  title="JSON B"
                  sampleText={sampleJSON2}
                  height="480px"
                />
              </div>
            </div>
          ) : (
            /* Diff Editor */
            <div className="border border-border rounded overflow-hidden bg-card shadow-none">
              <div className="bg-muted/40 border-b border-border px-3 py-1.5 text-xs text-muted-foreground flex justify-between select-none">
                <span>Code Comparison</span>
                <span className="text-[10px] font-bold text-foreground">GitHub-Style Diff View</span>
              </div>
              <div className="h-[500px] bg-background">
                {mounted ? (
                  <MonacoDiffEditor
                    original={input1}
                    modified={input2}
                    language="json"
                    theme={theme}
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
          )}
        </div>

        {/* Diff Summary Card & Detailed breakdown (only when compared) */}
        {compared && diffs.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Vercel-style Summary Card */}
            <div className="border border-border rounded bg-card p-5 shadow-none select-none">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider border-b pb-3.5 mb-4">
                <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                <span>Difference Summary Report</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="border border-border rounded p-3 bg-muted/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Total Differences</span>
                  <strong className="text-xl font-bold text-foreground block mt-1">{diffs.length}</strong>
                </div>

                <div className="border border-border rounded p-3 bg-muted/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Keys Added</span>
                  <strong className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                    +{additionsCount}
                  </strong>
                </div>

                <div className="border border-border rounded p-3 bg-muted/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Keys Removed</span>
                  <strong className="text-xl font-bold text-destructive block mt-1">
                    -{deletionsCount}
                  </strong>
                </div>

                <div className="border border-border rounded p-3 bg-muted/10">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Keys Modified</span>
                  <strong className="text-xl font-bold text-amber-600 dark:text-amber-500 block mt-1">
                    {modificationsCount}
                  </strong>
                </div>
              </div>
            </div>

            {/* Path breakdown list */}
            <div className="border border-border rounded p-5 space-y-4 bg-card shadow-none">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Detailed Key Discrepancies</h3>
                  <p className="text-[11px] text-muted-foreground">List of modified keys and indices mapped to their object location paths.</p>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full md:w-auto">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search paths..."
                      value={diffSearchQuery}
                      onChange={(e) => setDiffSearchQuery(e.target.value)}
                      className="w-full text-xs bg-background border border-border rounded pl-7 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="flex border border-border rounded p-0.5 bg-background w-full sm:w-auto overflow-x-auto">
                    {(["all", "added", "removed", "modified"] as const).map((type) => (
                      <Button
                        key={type}
                        variant={diffFilterType === type ? "secondary" : "ghost"}
                        size="xs"
                        className="h-6 text-[10px] px-2 rounded capitalize font-semibold flex-1 whitespace-nowrap"
                        onClick={() => setDiffFilterType(type)}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid cards */}
              {filteredDiffs.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredDiffs.map((diff, index) => (
                    <div
                      key={index}
                      className="text-xs font-mono border border-border rounded p-3.5 flex flex-col justify-between gap-3 bg-muted/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-bold text-foreground break-all text-xs block leading-tight">
                            {diff.path}
                          </span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Key Path</span>
                        </div>
                        
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                          diff.type === "added"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : diff.type === "removed"
                            ? "bg-destructive/10 border-destructive/20 text-destructive"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500"
                        }`}>
                          {diff.type}
                        </span>
                      </div>

                      <div className="bg-background border border-border rounded p-2 text-[10.5px] font-mono leading-normal break-all select-all">
                        {diff.type === "modified" && (
                          <div className="space-y-1">
                            <div className="flex items-start gap-1 text-destructive">
                              <Minus className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{JSON.stringify(diff.oldValue)}</span>
                            </div>
                            <div className="flex items-start gap-1 text-emerald-600 dark:text-emerald-400">
                              <Plus className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{JSON.stringify(diff.newValue)}</span>
                            </div>
                          </div>
                        )}
                        {diff.type === "added" && (
                          <div className="flex items-start gap-1 text-emerald-600 dark:text-emerald-400">
                            <Plus className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{JSON.stringify(diff.newValue)}</span>
                          </div>
                        )}
                        {diff.type === "removed" && (
                          <div className="flex items-start gap-1 text-destructive">
                            <Minus className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{JSON.stringify(diff.oldValue)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground font-medium">
                  No discrepancy matches.
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </ToolPageLayout>
  );
}