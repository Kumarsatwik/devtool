"use client";

import { useEffect, useRef, useState } from "react";
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
import { NotesSidebar } from "@/components/notes/notes-sidebar";
import { MarkdownPane } from "@/components/notes/markdown-pane";
import { useNotes } from "@/hooks/use-notes";
import { markdownToHtml } from "@/lib/notes/markdown";
import {
  exportAsDocx,
  exportAsHtml,
  exportAsMarkdown,
  exportAsPdf,
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

export default function MarkdownPreviewPage() {
  const { notes, activeNote, setActiveId, addNote, updateNote, deleteNote } = useNotes();
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const loadedNoteId = useRef<string | null>(null);

  const editor = useEditor({
    extensions,
    content: activeNote?.html ?? "<p></p>",
    // Required for Next.js SSR — render the editor on the client only
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "note-editor", spellcheck: "true" },
    },
    onUpdate: ({ editor: e }) => {
      if (loadedNoteId.current) {
        updateNote(loadedNoteId.current, { html: e.getHTML() });
      }
    },
  });

  // Load content when the active note changes
  useEffect(() => {
    if (!editor || !activeNote) return;
    if (loadedNoteId.current === activeNote.id) return;
    loadedNoteId.current = activeNote.id;
    editor.commands.setContent(activeNote.html, { emitUpdate: false });
  }, [editor, activeNote]);

  const handleOpenFile = async (file: File) => {
    const text = await file.text();
    const title = file.name.replace(/\.(md|markdown|txt)$/i, "");
    addNote(title, markdownToHtml(text));
  };

  const handleExport = async (format: ExportFormat) => {
    if (!editor || !activeNote) return;
    const title = activeNote.title || "Untitled note";
    const html = editor.getHTML();
    setExporting(format);
    try {
      switch (format) {
        case "md":
          exportAsMarkdown(title, html);
          break;
        case "txt":
          exportAsTxt(title, html);
          break;
        case "html":
          await exportAsHtml(title, html);
          break;
        case "pdf":
          await exportAsPdf(title, html);
          break;
        case "docx":
          await exportAsDocx(title, html);
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
          <NotesSidebar
            notes={notes}
            activeId={activeNote?.id}
            onSelect={setActiveId}
            onAdd={() => addNote()}
            onDelete={deleteNote}
          />
          <main className="notes-main">
            <input
              className="title-input"
              value={activeNote?.title ?? ""}
              placeholder="Untitled note"
              onChange={(e) => activeNote && updateNote(activeNote.id, { title: e.target.value })}
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
              {showMarkdown && activeNote && (
                <MarkdownPane editor={editor} noteId={activeNote.id} />
              )}
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
