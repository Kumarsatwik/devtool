"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, List, Table, Settings2, FileSpreadsheet, Upload, RefreshCw } from "lucide-react";

interface LoadedWorkbook {
  sheets: string[];
  fileName: string;
  fileSize: number;
  data: ArrayBuffer;
}

export default function ExcelToCSVPage() {
  const [workbook, setWorkbook] = useState<LoadedWorkbook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewTab, setPreviewTab] = useState<string>("raw");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);

  const convertSheet = useCallback((data: ArrayBuffer, wbName: string, targetSheet?: string) => {
    try {
      const wb = XLSX.read(data, { type: "array" });
      const sheets = wb.SheetNames;
      if (sheets.length === 0) {
        setError("No sheets found in the workbook.");
        return;
      }

      const selected = targetSheet && sheets.includes(targetSheet) ? targetSheet : sheets[0];
      const ws = wb.Sheets[selected];
      if (!ws) {
        setError(`Sheet "${selected}" could not be read.`);
        return;
      }

      const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });

      setWorkbook({ sheets, fileName: wbName, fileSize: data.byteLength, data });
      setSheetName(selected);
      setOutput(csv);
      setError(null);

      const parsed = Papa.parse<Record<string, string>>(csv, {
        header: true,
        skipEmptyLines: true,
      });
      setHeaders(parsed.meta.fields || []);
      setRows(parsed.data);
      setPreviewTab("raw");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse Excel file");
      setOutput("");
      setHeaders([]);
      setRows([]);
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setOutput("");
      setHeaders([]);
      setRows([]);

      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(extension || "")) {
        setError("Unsupported file format. Please upload an .xlsx, .xls, or .csv file.");
        return;
      }

      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result instanceof ArrayBuffer) {
          convertSheet(result, file.name);
        } else {
          setError("Could not read file content.");
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setError("An error occurred while reading the file.");
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    },
    [convertSheet],
  );

  const handleSheetChange = (name: string) => {
    if (!workbook) return;
    convertSheet(workbook.data, workbook.fileName, name);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  const previewRows = rows.slice(0, 50);

  return (
    <ToolPageLayout title="Excel to CSV" description="Convert Excel spreadsheets (.xlsx / .xls) into clean comma-separated CSV sheets.">
      <div className="h-full flex flex-col gap-4">

        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Options</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none">
              <span>Sheet</span>
              <select
                value={sheetName}
                onChange={(e) => handleSheetChange(e.target.value)}
                disabled={!workbook}
                className="text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
              >
                {!workbook && <option value="">No workbook loaded</option>}
                {workbook?.sheets.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            {workbook && (
              <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded border border-border">
                {workbook.fileName}
              </span>
            )}
          </div>
        </div>

        {/* Input vs Output */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-2">

          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Source Workbook</label>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex-1 min-h-0 group relative flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                dragActive ? "border-primary bg-primary/5 scale-[0.99]" : ""
              } ${loading ? "pointer-events-none opacity-80" : ""}`}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleChange}
                disabled={loading}
              />

              <div className="flex flex-col items-center gap-2">
                {loading ? (
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                ) : workbook ? (
                  <FileSpreadsheet className="h-8 w-8 text-emerald-500 animate-in zoom-in-75 duration-200" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-y-[-2px] duration-300" />
                )}

                <div className="space-y-1">
                  {loading ? (
                    <p className="text-xs font-semibold text-foreground">Reading workbook...</p>
                  ) : workbook ? (
                    <>
                      <p className="text-xs font-semibold text-foreground">{workbook.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(workbook.fileSize / 1024).toFixed(1)} KB · {workbook.sheets.length} sheet{workbook.sheets.length === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to load a different file
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-foreground">
                        Drag and drop your Excel file here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Accepted formats: .xlsx, .xls (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {workbook && workbook.sheets.length > 1 && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-semibold rounded shadow-none"
                  onClick={() => inputRef.current?.click()}
                >
                  Load Another File
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Output CSV</label>

            <Tabs value={previewTab} onValueChange={setPreviewTab} className="w-full flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between bg-muted/40 border border-border border-b-0 px-3 py-1.5 rounded-t select-none shrink-0">
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

              <div className="border border-border rounded-b overflow-hidden shadow-none flex-1 min-h-0">
                <TabsContent value="raw" className="p-0 m-0 h-full data-[state=inactive]:hidden">
                  <EditorPanel
                    value={output}
                    language="plaintext"
                    readOnly
                    height="fill"
                    downloadFileName="converted.csv"
                    downloadExtension="csv"
                    className="h-full"
                  />
                </TabsContent>

                <TabsContent value="preview" className="p-0 m-0 bg-background h-full data-[state=inactive]:hidden">
                  <div className="h-full overflow-auto relative">
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
                              {headers.map((h) => (
                                <td key={h} className="p-2 border-r border-border font-mono max-w-[180px] truncate text-foreground">
                                  {row[h]}
                                </td>
                              ))}
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
                    <div className="bg-muted/20 border-t px-3 py-1.5 text-xs text-muted-foreground flex justify-between select-none">
                      <span>Showing first 50 of {rows.length} rows</span>
                      <span className="font-semibold text-foreground">Tabular Preview</span>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Diagnostics report */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Conversion failed</p>
              <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {output && !error && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <div>
                <span className="font-semibold text-foreground">Sheet &quot;{sheetName}&quot; converted to CSV.</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-4">
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
