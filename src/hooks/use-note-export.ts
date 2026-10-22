"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { ExportFormat } from "@/components/notes/toolbar";
import {
  exportAsDocx,
  exportAsHtml,
  exportAsMarkdown,
  exportAsTxt,
} from "@/lib/notes/exporters";

export function useNoteExport(editor: Editor | null, title: string) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (!editor) return;
    const noteTitle = title || "Untitled note";
    const editorHtml = editor.getHTML();

    setExporting(format);
    try {
      switch (format) {
        case "md":
          exportAsMarkdown(noteTitle, editorHtml);
          break;
        case "txt":
          exportAsTxt(noteTitle, editorHtml);
          break;
        case "html":
          await exportAsHtml(noteTitle, editorHtml);
          break;
        case "docx":
          await exportAsDocx(noteTitle, editorHtml);
          break;
      }
    } catch (err) {
      console.error(err);
      window.alert(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setExporting(null);
    }
  };

  return { exporting, handleExport };
}
