"use client";

import { useState, useCallback } from "react";
import { useAutoRun } from "@/hooks/use-auto-run";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { StatusMessage } from "@/components/status-message";
import { ResizableSplit } from "@/components/resizable-split";
import { FileUpload } from "@/components/file-upload";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Settings2 } from "lucide-react";
import { parseCsv } from "@/lib/csv";
import { byteLength } from "@/lib/bytes";

const sampleCSV = `name,age,city,isDeveloper
John,25,New York,true
Mike,30,Los Angeles,false
Sarah,28,Chicago,true`;

export default function CsvToJsonPanel() {
  const [input, setInput] = useState(sampleCSV);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ columns: number; rows: number; size: number } | null>(null);

  // Settings states
  const [delimiter, setDelimiter] = useState<string>(""); 
  const [dynamicTyping, setDynamicTyping] = useState<boolean>(true);
  const [autoConvert, setAutoConvert] = useState(true);

  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      setMeta(null);
      return;
    }

    try {
      setError(null);
      
      const parsed = parseCsv(input.trim(), {
        dynamicTyping,
        delimiter: delimiter || undefined,
        failOnError: true,
      });

      if (parsed.data.length === 0) {
        setError("No tabular records detected in CSV input.");
        return;
      }

      const json = JSON.stringify(parsed.data, null, 2);
      setOutput(json);

      setMeta({
        columns: parsed.headers.length,
        rows: parsed.data.length,
        size: byteLength(input),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    }
  }, [input, delimiter, dynamicTyping]);

  // Handle auto conversion
  useAutoRun(autoConvert, handleConvert);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  return (
      <div className="h-full flex flex-col gap-4">

        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Format Options</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Delimiter */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Delimiter:</span>
              <select
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-foreground text-xs font-semibold"
              >
                <option value="">Auto-Detect</option>
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
                <option value="&#9;">Tab (\t)</option>
              </select>
            </div>

            {/* Dynamic Typing */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={dynamicTyping}
                onChange={(e) => setDynamicTyping(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Smart Type Cast</span>
            </label>

            {/* Auto Convert */}
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
        <ResizableSplit
          label="Resize CSV input and JSON output"
          first={
            <>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Source CSV</label>
              <EditorPanel
                value={input}
                onChange={setInput}
                language="plaintext"
                title="CSV Input"
                sampleText={sampleCSV}
                accept=".csv,.tsv,.txt"
                height="fill"
                className="flex-1 min-h-0"
              />
            </>
          }
          second={
            <>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Output JSON</label>
              <EditorPanel
                value={output}
                language="json"
                readOnly
                title="JSON Output"
                downloadFileName="converted.json"
                height="fill"
                className="flex-1 min-h-0"
              />
            </>
          }
        />

        {/* Drag and Drop File Upload Area */}
        {!input && (
          <FileUpload
            accept=".csv,.tsv,.txt"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop your CSV / TSV file here, or click to browse"
          />
        )}

        {/* Manual Convert Trigger */}
        {!autoConvert && (
          <div className="flex items-center gap-2">
            <Button onClick={handleConvert} size="sm" className="font-semibold rounded shadow-none">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Convert CSV
            </Button>
          </div>
        )}

        {/* Status Message Report */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Parsing Discrepancy</p>
              <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {meta && !error && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <div>
                <span className="font-semibold text-foreground">Parsing successful.</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>Columns: <strong className="text-foreground">{meta.columns}</strong></span>
                <span>Records: <strong className="text-foreground">{meta.rows}</strong></span>
                <span>File Size: <strong className="text-foreground">{(meta.size / 1024).toFixed(2)} KB</strong></span>
              </div>
            </div>
          </StatusMessage>
        )}

      </div>
  );
}
