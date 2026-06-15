"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { jsonToCSV } from "@/lib/csv";
import { validateJSON } from "@/lib/json";
import { AlertCircle, CheckCircle2, List, Table, Settings2 } from "lucide-react";

const sampleJSON = `[
  {"name": "John Doe", "age": 25, "city": "New York", "role": "Frontend Eng"},
  {"name": "Mike Smith", "age": 30, "city": "Los Angeles", "role": "Product Mgr"},
  {"name": "Sarah Connor", "age": 28, "city": "Chicago", "role": "Sec Architect"},
  {"name": "Alice Johnson", "age": 32, "city": "Seattle", "role": "DevOps Lead"},
  {"name": "Bob Vance", "age": 41, "city": "Scranton", "role": "Refrigeration Specialist"}
]`;

export default function JSONToCSVPage() {
  const [input, setInput] = useState(sampleJSON);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [autoConvert, setAutoConvert] = useState(true);
  const [previewTab, setPreviewTab] = useState<string>("raw");
  
  // Table states
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      setHeaders([]);
      setRows([]);
      return;
    }

    try {
      setError(null);
      const validation = validateJSON(input);
      if (!validation.valid) {
        setError(validation.error || "Malformed JSON data");
        setHeaders([]);
        setRows([]);
        return;
      }

      const parsedData = validation.parsed;
      if (!Array.isArray(parsedData)) {
        setError("Input must be a JSON array of objects");
        setHeaders([]);
        setRows([]);
        return;
      }

      if (parsedData.length === 0) {
        setError("JSON array is empty");
        setHeaders([]);
        setRows([]);
        return;
      }

      const csv = jsonToCSV(parsedData);
      setOutput(csv);

      // Extract unique keys as headers
      const allKeys = Array.from(
        new Set(parsedData.flatMap((item) => (item && typeof item === "object" ? Object.keys(item) : [])))
      );
      setHeaders(allKeys);
      setRows(parsedData as Record<string, unknown>[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setHeaders([]);
      setRows([]);
    }
  }, [input]);

  // Live compile
  useEffect(() => {
    if (autoConvert) {
      handleConvert();
    }
  }, [input, autoConvert, handleConvert]);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  const previewRows = rows.slice(0, 50);

  return (
    <ToolPageLayout title="JSON to CSV" description="Convert JSON array structures into standard spreadsheet-ready CSV sheets.">
      <div className="space-y-6">
        
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Options</span>
          </div>

          <div className="flex items-center gap-4">
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

        {/* Input vs Output Editors */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source JSON Array</label>
            <EditorPanel
              value={input}
              onChange={setInput}
              language="json"
              title="JSON Input"
              sampleText={sampleJSON}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Output CSV</label>
            
            <Tabs value={previewTab} onValueChange={setPreviewTab} className="w-full">
              <div className="flex items-center justify-between bg-muted/40 border border-border border-b-0 px-3 py-1.5 rounded-t select-none">
                <TabsList variant="line" className="h-6 gap-2">
                  <TabsTrigger value="raw" className="text-xs gap-1 py-0 px-2.5 h-6 rounded">
                    <List className="h-3.5 w-3.5" />
                    <span>Raw Text</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="preview" 
                    className="text-xs gap-1 py-0 px-2.5 h-6 rounded"
                    disabled={!output}
                  >
                    <Table className="h-3.5 w-3.5" />
                    <span>Table Grid</span>
                  </TabsTrigger>
                </TabsList>
                <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded border border-border">CSV</span>
              </div>

              <div className="border border-border rounded-b overflow-hidden shadow-none">
                <TabsContent value="raw" className="p-0 m-0">
                  <EditorPanel
                    value={output}
                    language="plaintext"
                    readOnly
                    height="480px"
                    downloadFileName="converted.csv"
                  />
                </TabsContent>
                
                <TabsContent value="preview" className="p-0 m-0 bg-background">
                  <div className="h-[480px] overflow-auto relative">
                    {rows.length > 0 ? (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-muted/65 text-muted-foreground font-semibold border-b sticky top-0 bg-background z-10">
                          <tr>
                            <th className="p-2 border-r border-border text-center w-10 bg-muted/60">#</th>
                            {headers.map((h) => (
                              <th key={h} className="p-2 border-r border-border capitalize font-bold text-foreground bg-muted/60">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/20 transition-colors odd:bg-background even:bg-muted/5">
                              <td className="p-2 text-center text-muted-foreground border-r border-border font-mono bg-muted/5">
                                {idx + 1}
                              </td>
                              {headers.map((h) => {
                                const val = row[h];
                                return (
                                  <td key={h} className="p-2 border-r border-border font-mono max-w-[180px] truncate text-foreground">
                                    {val === null ? "null" : val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                        No grid preview available
                      </div>
                    )}
                  </div>
                  
                  {rows.length > 50 && (
                    <div className="bg-muted/20 border-t px-3 py-1.5 text-[10px] text-muted-foreground flex justify-between select-none">
                      <span>Showing first 50 of {rows.length} rows</span>
                      <span className="font-semibold text-foreground">Tabular Preview</span>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* File drop area */}
        {!input && (
          <FileUpload
            accept=".json"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop your JSON file here, or click to browse"
          />
        )}

        {/* Manual compiler */}
        {!autoConvert && (
          <div className="flex items-center gap-2">
            <Button onClick={handleConvert} size="sm" className="font-semibold rounded shadow-none">
              Convert JSON
            </Button>
          </div>
        )}

        {/* Diagnostics report */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Compilation failed</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {output && !error && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <div>
                <span className="font-semibold text-foreground">Successfully parsed JSON array.</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-4">
                <span>Columns Detected: <strong className="text-foreground">{headers.length}</strong></span>
                <span>Total Records: <strong className="text-foreground">{rows.length}</strong></span>
              </div>
            </div>
          </StatusMessage>
        )}
        
      </div>
    </ToolPageLayout>
  );
}