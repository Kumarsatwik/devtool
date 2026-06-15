"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileLoaded: (content: string, fileName: string) => void;
  accept: string;
  maxSizeMB?: number;
  label?: string;
  className?: string;
}

export function FileUpload({
  onFileLoaded,
  accept,
  maxSizeMB = 10,
  label = "Drag and drop your file here, or click to browse",
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setSuccess(null);

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds the limit of ${maxSizeMB}MB.`);
      return;
    }

    // Validate extension
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    const acceptedExtensions = accept.split(",").map(ext => ext.trim().toLowerCase());
    
    if (accept !== "*" && !acceptedExtensions.includes(extension)) {
      setError(`Unsupported file format. Please upload: ${accept}`);
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        onFileLoaded(result, file.name);
        setSuccess(`Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError("Could not read file content.");
      }
      setLoading(false);
    };

    reader.onerror = () => {
      setError("An error occurred while reading the file.");
      setLoading(false);
    };

    reader.readAsText(file);
  }, [accept, maxSizeMB, onFileLoaded]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      className={cn(
        "group relative flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl p-6 text-center cursor-pointer transition-all duration-300",
        dragActive && "border-primary bg-primary/5 scale-[0.99]",
        loading && "pointer-events-none opacity-80",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
        disabled={loading}
      />

      <div className="flex flex-col items-center gap-2">
        {loading ? (
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        ) : success ? (
          <CheckCircle className="h-8 w-8 text-emerald-500 animate-in zoom-in-75 duration-200" />
        ) : error ? (
          <AlertCircle className="h-8 w-8 text-destructive animate-in shake duration-200" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-y-[-2px] duration-300" />
        )}

        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">
            {loading ? "Reading file..." : success ? success : error ? error : label}
          </p>
          {!loading && !success && !error && (
            <p className="text-[10px] text-muted-foreground">
              Accepted formats: {accept} (max {maxSizeMB}MB)
            </p>
          )}
          {error && (
            <p className="text-[10px] text-destructive/80">
              Click to try another file
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
