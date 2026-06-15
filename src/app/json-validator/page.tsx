"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { validateJSON } from "@/lib/json";
import { AlertCircle, CheckCircle2, ShieldCheck, Terminal, Info } from "lucide-react";

const sampleJSON = `{
  "name": "JSON Validator",
  "version": 1.0,
  "description": "Validation checks with line coordinates",
  "clientSideOnly": true,
  "supportedFormats": [
    "RFC 8259",
    "ECMA-404"
  ],
  "errorTriggers": {
    "missingComma": "Check the line below"
    "nestedData": {}
  }
}`;

export default function JSONValidatorPage() {
  const [input, setInput] = useState(sampleJSON);
  const [validation, setValidation] = useState<{ valid: boolean; error?: string; parsed?: unknown } | null>(null);
  const [autoValidate, setAutoValidate] = useState(true);

  const handleValidate = useCallback(() => {
    if (!input.trim()) {
      setValidation(null);
      return;
    }
    setValidation(validateJSON(input));
  }, [input]);

  // Live validation
  useEffect(() => {
    if (autoValidate) {
      handleValidate();
    }
  }, [input, autoValidate, handleValidate]);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  const parseErrorDetails = (errorMessage: string) => {
    const match = errorMessage.match(/position (\d+)/);
    if (match) {
      const position = parseInt(match[1], 10);
      const beforeError = input.substring(0, position);
      const lines = beforeError.split("\n");
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      
      const allLines = input.split("\n");
      const errorLineText = allLines[line - 1] || "";
      
      return { line, col, snippet: errorLineText.trim() };
    }
    return null;
  };

  const getJSONMetrics = (parsed: unknown) => {
    if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed);
      const size = new Blob([input]).size;
      return {
        keys: keys.length,
        size: (size / 1024).toFixed(2) + " KB",
        type: Array.isArray(parsed) ? "Array" : "Object",
      };
    }
    return null;
  };

  const errorMeta = validation?.error ? parseErrorDetails(validation.error) : null;
  const metrics = validation?.valid ? getJSONMetrics(validation.parsed) : null;

  return (
    <ToolPageLayout title="JSON Validator" description="Validate JSON syntax and check for errors.">
      <div className="space-y-6">
        
        {/* Linter Options */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span>Options</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={autoValidate}
                onChange={(e) => setAutoValidate(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Live Validate</span>
            </label>
          </div>
        </div>

        {/* Workspace Split Layout */}
        <div className="grid gap-6 lg:grid-cols-5">
          
          {/* Input Editor */}
          <div className="lg:col-span-3 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">JSON Input</label>
            <EditorPanel
              value={input}
              onChange={setInput}
              language="json"
              title="JSON Linter Input"
              sampleText={sampleJSON}
              height="480px"
            />
          </div>

          {/* Validation Diagnostics Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Diagnostics</label>
            
            {validation ? (
              <div className="space-y-4">
                
                {/* Result Status Card */}
                <div className={`border rounded p-4 shadow-none transition-all duration-150 ${
                  validation.valid 
                    ? "border-border bg-card" 
                    : "border-destructive/20 bg-destructive/5"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded border ${
                      validation.valid 
                        ? "bg-secondary text-foreground border-border" 
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}>
                      {validation.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        {validation.valid ? "JSON is syntactically valid" : "Syntax errors found"}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {validation.valid 
                          ? "Matches specifications." 
                          : "Format checks failed. Resolve error paths."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Valid Statistics */}
                {validation.valid && metrics && (
                  <div className="border border-border rounded p-4 space-y-4 bg-card shadow-none animate-in fade-in duration-150">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b pb-2">
                      <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Details</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs leading-normal">
                      <div className="border border-border rounded p-2 bg-muted/10">
                        <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Type</span>
                        <strong className="text-sm font-bold text-foreground block mt-0.5">{metrics.type}</strong>
                      </div>
                      <div className="border border-border rounded p-2 bg-muted/10">
                        <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Root Keys</span>
                        <strong className="text-sm font-bold text-foreground block mt-0.5">{metrics.keys}</strong>
                      </div>
                      <div className="border border-border rounded p-2 bg-muted/10 col-span-2">
                        <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Document Size</span>
                        <strong className="text-sm font-bold text-foreground block mt-0.5">{metrics.size}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invalid Linter Details */}
                {!validation.valid && validation.error && (
                  <div className="border border-border rounded p-4 space-y-4 bg-card shadow-none animate-in fade-in duration-150">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5 border-b pb-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Error Details</span>
                    </h4>

                    <div className="space-y-3">
                      <div className="bg-destructive/5 text-destructive border border-destructive/20 rounded p-2.5 text-xs font-mono break-all leading-normal">
                        {validation.error}
                      </div>

                      {errorMeta && (
                        <div className="border border-border rounded p-3 space-y-2 bg-muted/10 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-semibold flex items-center gap-1">
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              Coordinates:
                            </span>
                            <span className="font-bold text-foreground font-mono bg-background border rounded px-1.5 py-0.5">
                              Line {errorMeta.line}, Col {errorMeta.col}
                            </span>
                          </div>
                          
                          {errorMeta.snippet && (
                            <div className="mt-2 space-y-1">
                              <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Context:</span>
                              <pre className="font-mono bg-background text-[11px] p-2 border rounded overflow-x-auto text-muted-foreground">
                                {errorMeta.snippet}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="border border-dashed rounded p-6 text-center bg-card/10 border-border h-[200px] flex flex-col justify-center items-center">
                <Terminal className="h-8 w-8 text-muted-foreground/35 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">No diagnostics compiled yet.</p>
              </div>
            )}
          </div>

        </div>

        {/* Drag and Drop File Upload Area */}
        {!input && (
          <FileUpload
            accept=".json"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop your JSON file here to run diagnostics"
          />
        )}

        {/* Manual validator */}
        {!autoValidate && (
          <div className="flex items-center gap-2">
            <Button onClick={handleValidate} size="sm" className="font-semibold rounded shadow-none">
              Validate JSON
            </Button>
          </div>
        )}

      </div>
    </ToolPageLayout>
  );
}