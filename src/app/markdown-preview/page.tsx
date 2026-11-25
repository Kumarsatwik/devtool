"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";

import { ToolPageLayout } from "@/components/tool-page-layout";
import { DiagramBlock } from "@/components/notes/diagram-block";
import { NotePreview } from "@/components/notes/note-preview";
import { SlideDeck } from "@/components/notes/slide-deck";
import { Toolbar, type ExportFormat } from "@/components/notes/toolbar";
import { MarkdownPane } from "@/components/notes/markdown-pane";
import { PdfExportOptions } from "@/components/notes/pdf-export-options";
import { SplitDivider, useSplitResize } from "@/components/resizable-split";
import { markdownToHtml } from "@/lib/notes/markdown";
import {
  DEFAULT_PDF_LAYOUT,
  type PdfLayoutOptions,
} from "@/lib/notes/pdf";
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
  Highlight.configure({ multicolor: true }),
  Image.configure({ inline: false, allowBase64: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  DiagramBlock,
];

const WELCOME_HTML = `
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

/**
 * Drop image sources that are not data: URLs. A pasted or imported
 * `<img src="https://…">` is fetched automatically by the browser, leaking the
 * reader's IP address and referrer to a third-party server. Only embedded
 * data: images — the ones this editor produces — are allowed through.
 */
function blockRemoteImages(html: string): string {
  if (!/<img/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("img").forEach((img) => {
    if (!/^data:image\//i.test(img.getAttribute("src") ?? "")) img.remove();
  });
  return doc.body.innerHTML;
}

const MAX_NOTE_FILE_SIZE_MB = 10;

export default function MarkdownPreviewPage() {
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState(WELCOME_HTML);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [slidesOpen, setSlidesOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [pdfOptionsOpen, setPdfOptionsOpen] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<PdfLayoutOptions>(
    DEFAULT_PDF_LAYOUT,
  );

  // 55% preserves the share the markdown pane had before it became draggable.
  const { isResizing, containerRef: workspaceRef, dividerProps, containerStyle } =
    useSplitResize({ initialPercent: 55 });

  const editor = useEditor({
    extensions,
    content: html,
    // Required for Next.js SSR — render the editor on the client only
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "note-editor", spellcheck: "true" },
      transformPastedHTML: blockRemoteImages,
    },
    onUpdate: ({ editor: e }) => {
      setHtml(e.getHTML());
    },
  });

  const handleOpenFile = async (file: File) => {
    if (file.size > MAX_NOTE_FILE_SIZE_MB * 1024 * 1024) {
      window.alert(
        `File is too large. Maximum size is ${MAX_NOTE_FILE_SIZE_MB}MB.`,
      );
      return;
    }
    const text = await file.text();
    const nextHtml = blockRemoteImages(markdownToHtml(text));
    setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ""));
    setHtml(nextHtml);
    editor?.commands.setContent(nextHtml, { emitUpdate: false });
  };

  const handleExport = async (
    format: ExportFormat,
    layout = pdfOptions,
  ) => {
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
        case "pdf":
          await exportAsPdf(title, editorHtml, layout);
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

  return (
    <ToolPageLayout
      title=""
      description="Rich Markdown note editor with live diagrams and multi-format export."
    >
      {editor ? (
        <>
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
                onExport={(format) => {
                  if (format === "pdf") setPdfOptionsOpen(true);
                  else void handleExport(format);
                }}
                exporting={exporting}
                showMarkdown={showMarkdown}
                onToggleMarkdown={() => setShowMarkdown((v) => !v)}
                onPreview={() => {
                  setSlidesOpen(false);
                  setPreviewOpen(true);
                }}
                onSlides={() => {
                  setPreviewOpen(false);
                  setSlidesOpen(true);
                }}
              />
              <div
                className={`notes-workspace${showMarkdown ? " split" : ""}${isResizing ? " is-resizing" : ""}`}
                ref={workspaceRef}
                style={showMarkdown ? containerStyle : undefined}
              >
                <div className="editor-scroll">
                  <EditorContent editor={editor} />
                </div>
                {showMarkdown && (
                  <SplitDivider
                    dividerProps={dividerProps}
                    isResizing={isResizing}
                    label="Resize editor and markdown panes"
                    className="notes-divider"
                  />
                )}
                {showMarkdown && <MarkdownPane editor={editor} />}
              </div>
            </main>
          </div>
          {pdfOptionsOpen && (
            <PdfExportOptions
              options={pdfOptions}
              onClose={() => setPdfOptionsOpen(false)}
              onExport={(options) => {
                setPdfOptions(options);
                setPdfOptionsOpen(false);
                void handleExport("pdf", options);
              }}
            />
          )}
          {previewOpen && (
            <NotePreview
              title={title}
              editorHtml={editor.getHTML()}
              onClose={() => setPreviewOpen(false)}
            />
          )}
          {slidesOpen && (
            <SlideDeck
              title={title}
              editorHtml={editor.getHTML()}
              onClose={() => setSlidesOpen(false)}
            />
          )}
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-border rounded-xl bg-card">
          Loading editor…
        </div>
      )}
    </ToolPageLayout>
  );
}
