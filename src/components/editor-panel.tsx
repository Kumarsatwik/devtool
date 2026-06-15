"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, Trash2, FileText, Upload, RefreshCw } from "lucide-react";
import { saveAs } from "file-saver";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface EditorPanelProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  title?: string;
  sampleText?: string;
  downloadFileName?: string;
}

export function EditorPanel({
  value,
  onChange,
  language = "json",
  readOnly = false,
  height = "480px",
  title,
  sampleText,
  downloadFileName,
}: EditorPanelProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const theme = mounted && resolvedTheme === "dark" ? "vs-dark" : "vs-light";

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    if (!value) return;
    const extension = language === "json" ? "json" : language === "javascript" ? "js" : "txt";
    const filename = downloadFileName || `file.${extension}`;
    const mimeType = language === "json" ? "application/json" : language === "javascript" ? "text/javascript" : "text/plain";
    
    const blob = new Blob([value], { type: `${mimeType};charset=utf-8` });
    saveAs(blob, filename);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        onChange(content);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card hover:border-border transition-colors duration-200">
      
      {/* Editor Header Bar */}
      {(title || onChange || value) && (
        <div className="flex items-center justify-between bg-muted/40 border-b border-border/85 px-3 py-1.5 text-xs select-none">
          <div className="flex items-center gap-2">
            {title && <span className="font-semibold text-foreground">{title}</span>}
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
              {language === "plaintext" ? "Text" : language}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Load Sample Data */}
            {!readOnly && onChange && sampleText && (
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                onClick={() => onChange(sampleText)}
                title="Load Sample Data"
              >
                <FileText className="h-3 w-3" />
                <span>Sample</span>
              </Button>
            )}

            {/* Upload File */}
            {!readOnly && onChange && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  accept={language === "json" ? ".json" : language === "javascript" ? ".js" : "*"}
                />
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  onClick={triggerFileInput}
                  title="Upload Local File"
                >
                  <Upload className="h-3 w-3" />
                  <span>Upload</span>
                </Button>
              </>
            )}

            {/* Copy Action */}
            {value && (
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                onClick={handleCopy}
                title="Copy to Clipboard"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            )}

            {/* Download Action */}
            {value && downloadFileName && (
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                onClick={handleDownload}
                title="Download File"
              >
                <Download className="h-3 w-3" />
                <span>Save</span>
              </Button>
            )}

            {/* Clear Action */}
            {!readOnly && onChange && value && (
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onChange("")}
                title="Clear Data"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Editor Body */}
      <div style={{ height }} className="relative bg-background">
        {!mounted ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span>Loading editor...</span>
          </div>
        ) : (
          <MonacoEditor
            language={language}
            theme={theme}
            value={value}
            onChange={onChange ? (v) => onChange(v || "") : undefined}
            options={{
              minimap: { enabled: false },
              lineNumbers: "on",
              wordWrap: "on",
              readOnly,
              scrollBeyondLastLine: false,
              fontSize: 13,
              padding: { top: 8 },
              renderLineHighlight: "none",
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
          />
        )}
      </div>
    </div>
  );
}