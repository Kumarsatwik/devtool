"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import { xmlToJson } from "@/lib/xml";
import { AlertCircle, CheckCircle2, CodeXml, Settings2 } from "lucide-react";

const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="bk101" available="true">
    <title>Clean Code</title>
    <author>Robert C. Martin</author>
    <price>32.99</price>
    <tags>
      <tag>programming</tag>
      <tag>craftsmanship</tag>
    </tags>
  </book>
  <book id="bk102" available="false">
    <title>The Pragmatic Programmer</title>
    <author>Andrew Hunt</author>
    <price>39.95</price>
    <tags>
      <tag>programming</tag>
    </tags>
  </book>
</catalog>`;

export default function XMLToJSONPage() {
  const [input, setInput] = useState(sampleXML);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [smartTypes, setSmartTypes] = useState(true);
  const [autoConvert, setAutoConvert] = useState(true);

  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      setError(null);
      setOutput(xmlToJson(input, { smartTypes }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setOutput("");
    }
  }, [input, smartTypes]);

  // Live compilation
  useEffect(() => {
    if (autoConvert) {
      handleConvert();
    }
  }, [input, smartTypes, autoConvert, handleConvert]);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  return (
    <ToolPageLayout
      title="XML to JSON"
      description="Convert XML documents into structured JSON. Attributes become @-prefixed keys, repeated elements become arrays, and mixed text is kept under #text."
    >
      <div className="h-full flex flex-col gap-4">

        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Format Options</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={smartTypes}
                onChange={(e) => setSmartTypes(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Smart Type Cast</span>
            </label>

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
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Source XML</label>
            <EditorPanel
              value={input}
              onChange={setInput}
              language="xml"
              title="XML Input"
              sampleText={sampleXML}
              accept=".xml,.xsl,.svg"
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>

          <div className="flex flex-col min-h-0 gap-2">
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
          </div>
        </div>

        {/* Drag and Drop File Upload Area */}
        {!input && (
          <FileUpload
            accept=".xml,.xsl,.svg"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop your XML file here, or click to browse"
          />
        )}

        {/* Manual Convert Trigger */}
        {!autoConvert && (
          <div className="flex items-center gap-2">
            <Button onClick={handleConvert} size="sm" className="font-semibold rounded shadow-none">
              <CodeXml className="h-4 w-4 mr-1.5" />
              Convert XML
            </Button>
          </div>
        )}

        {/* Status Message Report */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">XML Parsing Error</p>
              <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {output && !error && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <div>
                <span className="font-semibold text-foreground">XML converted successfully.</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>Input Size: <strong className="text-foreground">{new Blob([input]).size} Bytes</strong></span>
                <span>Output Size: <strong className="text-foreground">{new Blob([output]).size} Bytes</strong></span>
              </div>
            </div>
          </StatusMessage>
        )}

      </div>
    </ToolPageLayout>
  );
}
