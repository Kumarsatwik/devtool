"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { unmarshallDynamo, marshallDynamo, validateJSON } from "@/lib/json";
import { AlertCircle, CheckCircle2, Database, Settings2, ArrowRightLeft } from "lucide-react";

const sampleDynamoDB = `{
  "pk": {
    "S": "USER#1001"
  },
  "username": {
    "S": "johndoe"
  },
  "age": {
    "N": "28"
  },
  "roles": {
    "SS": [
      "User",
      "Admin"
    ]
  },
  "isActive": {
    "BOOL": true
  },
  "lastLogin": {
    "NULL": true
  }
}`;

const sampleStandard = `{
  "pk": "USER#1001",
  "username": "johndoe",
  "age": 28,
  "roles": [
    "User",
    "Admin"
  ],
  "isActive": true,
  "lastLogin": null
}`;

export default function DynamoDBConverterPage() {
  const [mode, setMode] = useState<"unmarshall" | "marshall">("unmarshall");
  const [input, setInput] = useState(sampleDynamoDB);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [autoConvert, setAutoConvert] = useState(true);

  // Switch samples when changing mode to be helpful to user
  const handleModeChange = (newMode: "unmarshall" | "marshall") => {
    setMode(newMode);
    if (newMode === "unmarshall") {
      setInput(sampleDynamoDB);
    } else {
      setInput(sampleStandard);
    }
  };

  const handleProcess = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      setError(null);
      if (mode === "unmarshall") {
        setOutput(unmarshallDynamo(input));
      } else {
        setOutput(marshallDynamo(input));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setOutput("");
    }
  }, [input, mode]);

  // Live compile
  useEffect(() => {
    if (autoConvert) {
      handleProcess();
    }
  }, [input, mode, autoConvert, handleProcess]);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  const validation = validateJSON(input);

  return (
    <ToolPageLayout 
      title="DynamoDB ↔ JSON" 
      description="Convert AWS DynamoDB attributes (unmarshal) to standard JSON, or encode regular JSON (marshal) for DynamoDB storage."
    >
      <div className="space-y-6">
        
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Format Controls</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Mode selection (Unmarshal vs Marshal) */}
            <div className="flex items-center border border-border rounded p-0.5 bg-background">
              <Button
                variant={mode === "unmarshall" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 gap-1 px-3 rounded text-[11px] font-semibold"
                onClick={() => handleModeChange("unmarshall")}
              >
                <ArrowRightLeft className="h-3 w-3" />
                <span>Unmarshal (DynamoDB → JSON)</span>
              </Button>
              <Button
                variant={mode === "marshall" ? "secondary" : "ghost"}
                size="xs"
                className="h-6 gap-1 px-3 rounded text-[11px] font-semibold"
                onClick={() => handleModeChange("marshall")}
              >
                <ArrowRightLeft className="h-3 w-3" />
                <span>Marshal (JSON → DynamoDB)</span>
              </Button>
            </div>

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
        <div className="grid gap-6 lg:grid-cols-2">
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {mode === "unmarshall" ? "Source DynamoDB JSON" : "Standard JSON Input"}
            </label>
            <EditorPanel
              value={input}
              onChange={setInput}
              language="json"
              title={mode === "unmarshall" ? "DynamoDB Input" : "Standard Input"}
              sampleText={mode === "unmarshall" ? sampleDynamoDB : sampleStandard}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {mode === "unmarshall" ? "Output Standard JSON" : "Output DynamoDB JSON"}
            </label>
            <EditorPanel
              value={output}
              language="json"
              readOnly
              title={mode === "unmarshall" ? "Standard JSON Output" : "DynamoDB Output"}
              downloadFileName={mode === "unmarshall" ? "standard.json" : "dynamodb.json"}
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
              <Database className="h-4 w-4 mr-1.5" />
              {mode === "unmarshall" ? "Unmarshal DynamoDB" : "Marshal JSON"}
            </Button>
          </div>
        )}

        {/* Diagnostics status message */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Conversion Error</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">{error}</p>
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
                    <span className="font-semibold text-foreground">Valid input structure.</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Character length: <strong className="text-foreground">{input.length}</strong>
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-destructive">JSON Syntax Check Failed</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{validation.error}</p>
                </div>
              </>
            )}
          </StatusMessage>
        )}
        
      </div>
    </ToolPageLayout>
  );
}
