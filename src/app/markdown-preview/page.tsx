"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";

import { ToolPageLayout } from "@/components/tool-page-layout";
import { MermaidBlock } from "@/components/notes/mermaid-block";
import { Toolbar, type ExportFormat } from "@/components/notes/toolbar";
import { MarkdownPane } from "@/components/notes/markdown-pane";
import { markdownToHtml } from "@/lib/notes/markdown";
import {
  exportAsDocx,
  exportAsHtml,
  exportAsMarkdown,
  exportAsTxt,
} from "@/lib/notes/exporters";
import "./notes.css";

const extensions = [
  StarterKit.configure({
    link: { openOnClick: false },
    codeBlock: { HTMLAttributes: { class: "code-block" } },
  }),
  TextStyleKit,
  Highlight.configure({ multicolor: false }),
  Image.configure({ inline: false, allowBase64: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  MermaidBlock,
];

const WELCOME_HTML = `
<h2>Welcome 👋</h2>
<p>This is a <strong>rich text</strong> note editor with <em>italic</em>, <u>underline</u>, <mark>highlight</mark> and full <strong>Markdown</strong> support.</p>
<ul>
  <li>Use the toolbar to format text, change fonts and sizes</li>
  <li>Insert images — they are embedded right into the note</li>
  <li>Add Mermaid diagrams with a live preview</li>
  <li>Open / save <code>.md</code> files, export to HTML, DOCX, TXT</li>
</ul>
<pre data-type="mermaid"><code>graph LR
  A[Write notes] --> B{Format}
  B --> C[Markdown]
  B --> D[Rich text]
  C --> E[Export: HTML / DOCX / TXT]
  D --> E</code></pre>
<blockquote><p>Tip: switch to the Markdown pane to edit raw markdown side by side.</p></blockquote>
`;

export default function MarkdownPreviewPage() {
  const [title, setTitle] = useState("Welcome");
  const [html, setHtml] = useState(WELCOME_HTML);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const editor = useEditor({
    extensions,
    content: html,
    // Required for Next.js SSR — render the editor on the client only
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "note-editor", spellcheck: "true" },
    },
    onUpdate: ({ editor: e }) => {
      setHtml(e.getHTML());
    },
  });

  const handleOpenFile = async (file: File) => {
    const text = await file.text();
    const nextHtml = markdownToHtml(text);
    setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ""));
    setHtml(nextHtml);
    editor?.commands.setContent(nextHtml, { emitUpdate: false });
  };

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
      window.alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <ToolPageLayout
      title=""
      description="Rich Markdown note editor with live diagrams and multi-format export."
    >
      {editor ? (
        <div className="notes-app">
          <main className="notes-main">
            <input
              className="title-input"
              value={title}
              placeholder="Untitled note"
              onChange={(e) => setTitle(e.target.value)}
            />
            <Toolbar
              editor={editor}
              onOpenFile={handleOpenFile}
              onExport={handleExport}
              exporting={exporting}
              showMarkdown={showMarkdown}
              onToggleMarkdown={() => setShowMarkdown((v) => !v)}
            />
            <div className={`notes-workspace${showMarkdown ? " split" : ""}`}>
              <div className="editor-scroll">
                <EditorContent editor={editor} />
              </div>
              {showMarkdown && <MarkdownPane editor={editor} />}
            </div>
          </main>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-border rounded-xl bg-card">
          Loading editor…
        </div>
      )}
    </ToolPageLayout>
  );
}
