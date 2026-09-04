"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { beautifyJSON, minifyJSON, validateJSON } from "@/lib/json";
import { AlertCircle, CheckCircle2, Sparkles, Settings2, Minimize2, AlignLeft } from "lucide-react";

const sampleJSON = `{"name":"DataTools platform","version":1.1,"isActive":true,"modules":["CSV-JSON","Linter","DiffEditor"],"environment":{"host":"localhost","port":3000}}`;

const spaceOptions = [
  { value: 2, label: "2 Spaces" },
  { value: 4, label: "4 Spaces" },
  { value: "\t", label: "Tab" },
];

export default function JSONBeautifierPage() {
  const [input, setInput] = useState(sampleJSON);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<number | string>(2);
  const [mode, setMode] = useState<"beautify" | "minify">("beautify");
  const [autoConvert, setAutoConvert] = useState(true);

  const handleProcess = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      setError(null);
      if (mode === "beautify") {
        setOutput(beautifyJSON(input, spaces));
      } else {
        setOutput(minifyJSON(input));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setOutput("");
    }
  }, [input, spaces, mode]);

  // Live compile
  useEffect(() => {
    if (autoConvert) {
      handleProcess();
    }
  }, [input, spaces, mode, autoConvert, handleProcess]);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  const validation = validateJSON(input);

  return (
    <ToolPageLayout title="JSON Beautifier" description="Format, indent, or collapse raw JSON data to read it easily.">
      <div className="h-full flex flex-col gap-4">

        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Format Controls</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Formatting Mode (Beautify vs Minify) */}
            <div className="flex items-center border border-border rounded p-0.5 bg-background">
              <Button
                variant={mode === "beautify" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 gap-1 px-3 rounded text-xs font-semibold"
                onClick={() => setMode("beautify")}
              >
                <AlignLeft className="h-3 w-3" />
                <span>Beautify</span>
              </Button>
              <Button
                variant={mode === "minify" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 gap-1 px-3 rounded text-xs font-semibold"
                onClick={() => setMode("minify")}
              >
                <Minimize2 className="h-3 w-3" />
                <span>Minify</span>
              </Button>
            </div>

            {/* Indent Sizes (Beautify only) */}
            {mode === "beautify" && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-semibold">Indentation:</span>
                <div className="flex border border-border rounded p-0.5 bg-background">
                  {spaceOptions.map((option) => (
                    <Button
                      key={option.label}
                      variant={spaces === option.value ? "secondary" : "ghost"}
                      size="xs"
                      className="h-6 text-xs px-2.5 rounded font-semibold"
                      onClick={() => setSpaces(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Auto compile toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={autoConvert}
                onChange={(e) => setAutoConvert(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Live Format</span>
            </label>
          </div>
        </div>

        {/* Editor workspace */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-2">

          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Raw JSON Code</label>
            <EditorPanel
              value={input}
              onChange={setInput}
              language="json"
              title="JSON Input"
              sampleText={sampleJSON}
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>

          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              {mode === "beautify" ? "Beautified JSON" : "Compressed JSON"}
            </label>
            <EditorPanel
              value={output}
              language="json"
              readOnly
              title="JSON Output"
              downloadFileName={mode === "beautify" ? "formatted.json" : "minified.json"}
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>
        </div>

        {/* File drop zone if empty */}
        {!input && (
          <FileUpload
            accept=".json"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop your JSON file here, or click to browse"
          />
        )}

        {/* Manual triggers */}
        {!autoConvert && (
          <div className="flex items-center gap-2">
            <Button onClick={handleProcess} size="sm" className="font-semibold rounded shadow-none">
              <Sparkles className="h-4 w-4 mr-1.5" />
              {mode === "beautify" ? "Beautify" : "Minify"}
            </Button>
          </div>
        )}

        {/* Diagnostics status message */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Compilation Error</p>
              <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {input && !error && (
          <StatusMessage type={validation.valid ? "success" : "error"}>
            {validation.valid ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  <div>
                    <span className="font-semibold text-foreground">Valid JSON structure check.</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Character length: <strong className="text-foreground">{input.length}</strong>
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-destructive">Syntax validation failed</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{validation.error}</p>
                </div>
              </>
            )}
          </StatusMessage>
        )}

      </div>
    </ToolPageLayout>
  );
}