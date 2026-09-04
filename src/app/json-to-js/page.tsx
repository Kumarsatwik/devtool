"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { validateJSON } from "@/lib/json";
import { AlertCircle, CheckCircle2, Settings2, Sparkles } from "lucide-react";

const sampleJSON = `{
  "name": "john doe",
  "age": 25,
  "city": "New York",
  "isActive": true,
  "skills": ["JavaScript", "TypeScript"],
  "address": {
    "street": "123 Main St",
    "zip": "10001"
  }
}`;

function jsonToJS(json: string, spaces: number = 2): string {
  const parsed = JSON.parse(json);

  const formatValue = (value: unknown, indent: string): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "number" || typeof value === "boolean") return String(value);

    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      const items = value.map((item) => {
        const formatted = formatValue(item, indent + "  ");
        return item && typeof item === "object"
          ? `\n${indent}  ${formatted}`
          : ` ${formatted}`;
      });
      const hasObjects = value.some((item) => typeof item === "object");
      if (hasObjects) return `[${items.join(",")}\n${indent}]`;
      return `[${items.join(",")} ]`;
    }

    if (typeof value === "object") {
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length === 0) return "{}";
      const indentStr = typeof spaces === "number" ? " ".repeat(spaces) : spaces;
      const formattedKeys = keys.map((key) => {
        const needsQuotes = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
        const keyStr = needsQuotes ? `"${key}"` : key;
        const valueStr = formatValue((value as Record<string, unknown>)[key], indent + indentStr);
        return `${indent}${indentStr}${keyStr}: ${valueStr}`;
      });
      return `{\n${formattedKeys.join(",\n")}\n${indent}}`;
    }

    return "undefined";
  };

  return formatValue(parsed, "");
}

export default function JSONToJSPage() {
  const [input, setInput] = useState(sampleJSON);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [spaces, setSpaces] = useState(2);
  const [autoConvert, setAutoConvert] = useState(true);

  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      setError(null);
      const js = jsonToJS(input, spaces);
      setOutput(js);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setOutput("");
    }
  }, [input, spaces]);

  // Live compilation
  useEffect(() => {
    if (autoConvert) {
      handleConvert();
    }
  }, [input, spaces, autoConvert, handleConvert]);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  const validation = validateJSON(input);

  return (
    <ToolPageLayout title="JSON to JS" description="Convert standard JSON text strings into unquoted JavaScript object literals.">
      <div className="h-full flex flex-col gap-4">

        {/* Settings Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Format Options</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Indent option */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Indentation:</span>
              <div className="flex border border-border rounded p-0.5 bg-background">
                {[2, 4].map((val) => (
                  <Button
                    key={val}
                    variant={spaces === val ? "secondary" : "ghost"}
                    size="xs"
                    className="h-6 text-xs px-2.5 rounded font-semibold"
                    onClick={() => setSpaces(val)}
                  >
                    {val} Spaces
                  </Button>
                ))}
              </div>
            </div>

            {/* Live toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={autoConvert}
                onChange={(e) => setAutoConvert(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Live Compile</span>
            </label>
          </div>
        </div>

        {/* Workspace Editors */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-2">

          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Source JSON Code</label>
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
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">JavaScript Object literal</label>
            <EditorPanel
              value={output}
              language="javascript"
              readOnly
              title="JS Output"
              downloadFileName="converted.js"
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>
        </div>

        {/* Drag and Drop File Upload Area */}
        {!input && (
          <FileUpload
            accept=".json"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop your JSON file here, or click to browse"
          />
        )}

        {/* Manual actions */}
        {!autoConvert && (
          <div className="flex items-center gap-2">
            <Button onClick={handleConvert} size="sm" className="font-semibold rounded shadow-none">
              <Sparkles className="h-4 w-4 mr-1.5" />
              Convert to JS
            </Button>
          </div>
        )}

        {/* Status reports */}
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
                    <span className="font-semibold text-foreground">Valid JSON syntax check.</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-4">
                    <span>Input Size: <strong className="text-foreground">{new Blob([input]).size} Bytes</strong></span>
                    <span>Output Size: <strong className="text-foreground">{new Blob([output]).size} Bytes</strong></span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-destructive">Invalid JSON syntax</p>
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