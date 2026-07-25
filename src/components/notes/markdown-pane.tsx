"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { htmlToMarkdown, markdownToHtml } from "@/lib/notes/markdown";

interface MarkdownPaneProps {
  editor: Editor;
  noteId: string;
}

/**
 * Live markdown source view. Editor changes stream in; typing here
 * is converted back into the rich editor (two-way sync).
 */
export function MarkdownPane({ editor, noteId }: MarkdownPaneProps) {
  const [text, setText] = useState(() => htmlToMarkdown(editor.getHTML()));
  const focused = useRef(false);
  const applyTimer = useRef<number | undefined>(undefined);

  // editor -> pane
  useEffect(() => {
    setText(htmlToMarkdown(editor.getHTML()));
    const onUpdate = () => {
      if (!focused.current) setText(htmlToMarkdown(editor.getHTML()));
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor, noteId]);

  // pane -> editor (debounced)
  const handleChange = (value: string) => {
    setText(value);
    window.clearTimeout(applyTimer.current);
    applyTimer.current = window.setTimeout(() => {
      editor.commands.setContent(markdownToHtml(value), { emitUpdate: true });
    }, 500);
  };

  return (
    <div className="md-pane">
      <div className="md-pane-header">Markdown source</div>
      <textarea
        className="md-pane-textarea"
        value={text}
        spellCheck={false}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(htmlToMarkdown(editor.getHTML()));
        }}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="# Write markdown here…"
      />
    </div>
  );
}
