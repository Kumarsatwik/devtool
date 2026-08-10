"use client";

import { useRef, useState, useEffect } from "react";
import { useEditorState, type Editor } from "@tiptap/react";

export type ExportFormat = "html" | "docx" | "txt" | "md";

interface ToolbarProps {
  editor: Editor;
  onOpenFile: (file: File) => void;
  onExport: (format: ExportFormat) => void;
  exporting: ExportFormat | null;
  showMarkdown: boolean;
  onToggleMarkdown: () => void;
}

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans Serif", value: "Helvetica, Arial, sans-serif" },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Monospace", value: 'Menlo, "Courier New", monospace' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Palatino", value: '"Palatino Linotype", Palatino, serif' },
  { label: "Garamond", value: 'Garamond, "Apple Garamond", serif' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
  { label: "Arial Black", value: '"Arial Black", Arial, sans-serif' },
  { label: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Rounded", value: '"Avenir Next", "Trebuchet MS", sans-serif' },
  { label: "Cursive", value: '"Comic Sans MS", "Bradley Hand", cursive' },
  { label: "Brush Script", value: '"Brush Script MT", "Snell Roundhand", cursive' },
  { label: "Copperplate", value: 'Copperplate, "Copperplate Gothic Light", fantasy' },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const DEFAULT_FONT_SIZE = 16;

function parsePx(value: string | undefined | null): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function Toolbar({
  editor,
  onOpenFile,
  onExport,
  exporting,
  showMarkdown,
  onToggleMarkdown,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      code: e.isActive("code"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      taskList: e.isActive("taskList"),
      blockquote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      fontFamily: (e.getAttributes("textStyle").fontFamily as string) ?? "",
      fontSize: parsePx(e.getAttributes("textStyle").fontSize as string) ?? DEFAULT_FONT_SIZE,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  useEffect(() => {
    const close = (ev: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(ev.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const chain = () => editor.chain().focus();

  const setFontSize = (size: number) => {
    const clamped = Math.min(96, Math.max(8, size));
    if (clamped === DEFAULT_FONT_SIZE) chain().unsetFontSize().run();
    else chain().setFontSize(`${clamped}px`).run();
  };

  const insertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      chain().setImage({ src: reader.result as string, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  };

  const btn = (active: boolean) => `tb-btn${active ? " is-active" : ""}`;

  return (
    <div className="toolbar">
      {/* File */}
      <div className="tb-group">
        <button
          className="tb-btn"
          title="Open Markdown file"
          onClick={() => fileInputRef.current?.click()}
        >
          📂 Open
        </button>
        <div className="tb-dropdown" ref={exportRef}>
          <button
            className={`tb-btn${exportOpen ? " is-active" : ""}`}
            title="Export note"
            onClick={() => setExportOpen((v) => !v)}
            disabled={exporting !== null}
          >
            {exporting ? `Exporting ${exporting.toUpperCase()}…` : "⬇ Export"}
          </button>
          {exportOpen && (
            <div className="tb-menu">
              {(["md", "html", "docx", "txt"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  className="tb-menu-item"
                  onClick={() => {
                    setExportOpen(false);
                    onExport(f);
                  }}
                >
                  {f === "md" ? "Markdown (.md)" : f.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <span className="tb-sep" />

      {/* History */}
      <div className="tb-group">
        <button className="tb-btn" title="Undo (⌘Z)" disabled={!state.canUndo} onClick={() => chain().undo().run()}>↩</button>
        <button className="tb-btn" title="Redo (⌘⇧Z)" disabled={!state.canRedo} onClick={() => chain().redo().run()}>↪</button>
      </div>

      <span className="tb-sep" />

      {/* Font family & size */}
      <div className="tb-group">
        <select
          className="tb-select"
          title="Font family"
          value={state.fontFamily}
          onChange={(e) => {
            const v = e.target.value;
            if (v) chain().setFontFamily(v).run();
            else chain().unsetFontFamily().run();
          }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value} style={{ fontFamily: f.value || undefined }}>
              {f.label}
            </option>
          ))}
        </select>
        <button className="tb-btn" title="Decrease font size" onClick={() => setFontSize(state.fontSize - 2)}>A−</button>
        <select
          className="tb-select tb-select-size"
          title="Font size"
          value={state.fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        >
          {!FONT_SIZES.includes(state.fontSize) && (
            <option value={state.fontSize}>{state.fontSize}</option>
          )}
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="tb-btn" title="Increase font size" onClick={() => setFontSize(state.fontSize + 2)}>A+</button>
      </div>

      <span className="tb-sep" />

      {/* Inline marks */}
      <div className="tb-group">
        <button className={btn(state.bold)} title="Bold (⌘B)" onClick={() => chain().toggleBold().run()}><b>B</b></button>
        <button className={btn(state.italic)} title="Italic (⌘I)" onClick={() => chain().toggleItalic().run()}><i>I</i></button>
        <button className={btn(state.underline)} title="Underline (⌘U)" onClick={() => chain().toggleUnderline().run()}><u>U</u></button>
        <button className={btn(state.strike)} title="Strikethrough" onClick={() => chain().toggleStrike().run()}><s>S</s></button>
        <button className={btn(state.highlight)} title="Highlight" onClick={() => chain().toggleHighlight().run()}>
          <span className="hl-swatch">H</span>
        </button>
        <button className={btn(state.code)} title="Inline code" onClick={() => chain().toggleCode().run()}>{"</>"}</button>
      </div>

      <span className="tb-sep" />

      {/* Blocks */}
      <div className="tb-group">
        <button className={btn(state.h1)} title="Heading 1" onClick={() => chain().toggleHeading({ level: 1 }).run()}>H1</button>
        <button className={btn(state.h2)} title="Heading 2" onClick={() => chain().toggleHeading({ level: 2 }).run()}>H2</button>
        <button className={btn(state.h3)} title="Heading 3" onClick={() => chain().toggleHeading({ level: 3 }).run()}>H3</button>
        <button className={btn(state.bulletList)} title="Bullet list" onClick={() => chain().toggleBulletList().run()}>• List</button>
        <button className={btn(state.orderedList)} title="Numbered list" onClick={() => chain().toggleOrderedList().run()}>1. List</button>
        <button className={btn(state.taskList)} title="Task list" onClick={() => chain().toggleTaskList().run()}>☑</button>
        <button className={btn(state.blockquote)} title="Blockquote" onClick={() => chain().toggleBlockquote().run()}>❝</button>
        <button className={btn(state.codeBlock)} title="Code block" onClick={() => chain().toggleCodeBlock().run()}>{"{ }"}</button>
        <button className="tb-btn" title="Horizontal rule" onClick={() => chain().setHorizontalRule().run()}>―</button>
      </div>

      <span className="tb-sep" />

      {/* Insert */}
      <div className="tb-group">
        <button className="tb-btn" title="Insert image" onClick={() => imageInputRef.current?.click()}>🖼 Image</button>
        <button className="tb-btn" title="Insert Mermaid diagram" onClick={() => chain().insertMermaid().run()}>◈ Diagram</button>
      </div>

      <span className="tb-flex" />

      <button
        className={btn(showMarkdown)}
        title="Toggle Markdown source pane"
        onClick={onToggleMarkdown}
      >
        Ⓜ Markdown
      </button>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onOpenFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) insertImage(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
