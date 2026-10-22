"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";

import { ToolPageLayout } from "@/components/shell/tool-page-layout";
import { extensions } from "@/components/notes/extensions";
import { WELCOME_HTML } from "@/lib/notes/welcome-content";
import { NotePreview } from "@/components/notes/note-preview";
import { SlideDeck } from "@/components/notes/slide-deck";
import { Toolbar } from "@/components/notes/toolbar";
import { MarkdownPane } from "@/components/notes/markdown-pane";
import { SplitDivider, useSplitResize } from "@/components/resizable-split";
import { markdownToHtml } from "@/lib/notes/markdown";
import { useNoteExport } from "@/hooks/use-note-export";
import "@/components/notes/notes.css";

export default function MarkdownPreviewPage() {
  const [title, setTitle] = useState("Welcome");
  const [html, setHtml] = useState(WELCOME_HTML);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [slidesOpen, setSlidesOpen] = useState(false);

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
    },
    onUpdate: ({ editor: e }) => {
      setHtml(e.getHTML());
    },
  });

  const { exporting, handleExport } = useNoteExport(editor, title);

  const handleOpenFile = async (file: File) => {
    const text = await file.text();
    const nextHtml = markdownToHtml(text);
    setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ""));
    setHtml(nextHtml);
    editor?.commands.setContent(nextHtml, { emitUpdate: false });
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
                onExport={handleExport}
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
