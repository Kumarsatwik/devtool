"use client";

import type { ReactNode } from "react";
import { Fragment, useRef, useState, useEffect } from "react";
import { useEditorState, type Editor } from "@tiptap/react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  {
    label: "Brush Script",
    value: '"Brush Script MT", "Snell Roundhand", cursive',
  },
  {
    label: "Copperplate",
    value: 'Copperplate, "Copperplate Gothic Light", fantasy',
  },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const DEFAULT_FONT_SIZE = 16;

function parsePx(value: string | undefined | null): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

const kbdCls =
  "inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] font-semibold leading-none text-foreground";

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={kbdCls}>{children}</kbd>;
}

function Shortcut({
  keys,
  alt = false,
  shift = false,
  mac,
}: {
  keys: string;
  alt?: boolean;
  shift?: boolean;
  mac: boolean;
}) {
  const parts = mac
    ? ["⌘", alt && "⌥", shift && "⇧", keys].filter(Boolean)
    : ["Ctrl", alt && "Alt", shift && "Shift", keys].filter(Boolean);
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-0.5">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="text-[10px] text-muted-foreground select-none">
              +
            </span>
          )}
          <Kbd>{p}</Kbd>
        </Fragment>
      ))}
    </span>
  );
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
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

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
      fontSize:
        parsePx(e.getAttributes("textStyle").fontSize as string) ??
        DEFAULT_FONT_SIZE,
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
      chain()
        .setImage({ src: reader.result as string, alt: file.name })
        .run();
    };
    reader.readAsDataURL(file);
  };

  const btn = (active: boolean) => `tb-btn${active ? " is-active" : ""}`;

  return (
    <TooltipProvider>
      <div className="toolbar">
        {/* File */}
        <div className="tb-group">
          <Tooltip>
            <TooltipTrigger>
              <button
                className="tb-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📂 Open
              </button>
            </TooltipTrigger>
            <TooltipContent>Open Markdown file</TooltipContent>
          </Tooltip>
          <div className="tb-dropdown" ref={exportRef}>
            <Tooltip>
              <TooltipTrigger>
                <button
                  className={`tb-btn${exportOpen ? " is-active" : ""}`}
                  onClick={() => setExportOpen((v) => !v)}
                  disabled={exporting !== null}
                >
                  {exporting
                    ? `Exporting ${exporting.toUpperCase()}…`
                    : "⬇ Export"}
                </button>
              </TooltipTrigger>
              <TooltipContent>Export note</TooltipContent>
            </Tooltip>
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
          <Tooltip>
            <TooltipTrigger>
              <button
                className="tb-btn"
                disabled={!state.canUndo}
                onClick={() => chain().undo().run()}
              >
                ↩
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Undo <Shortcut keys="Z" mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className="tb-btn"
                disabled={!state.canRedo}
                onClick={() => chain().redo().run()}
              >
                ↪
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Redo <Shortcut keys="Z" shift mac={isMac} />
            </TooltipContent>
          </Tooltip>
        </div>

        <span className="tb-sep" />

        {/* Font family & size */}
        <div className="tb-group">
          <Tooltip>
            <TooltipTrigger>
              <select
                className="tb-select"
                value={state.fontFamily}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) chain().setFontFamily(v).run();
                  else chain().unsetFontFamily().run();
                }}
              >
                {FONT_FAMILIES.map((f) => (
                  <option
                    key={f.label}
                    value={f.value}
                    style={{ fontFamily: f.value || undefined }}
                  >
                    {f.label}
                  </option>
                ))}
              </select>
            </TooltipTrigger>
            <TooltipContent>Font family</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className="tb-btn"
                onClick={() => setFontSize(state.fontSize - 2)}
              >
                A−
              </button>
            </TooltipTrigger>
            <TooltipContent>Decrease font size</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <select
                className="tb-select tb-select-size"
                value={state.fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              >
                {!FONT_SIZES.includes(state.fontSize) && (
                  <option value={state.fontSize}>{state.fontSize}</option>
                )}
                {FONT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </TooltipTrigger>
            <TooltipContent>Font size</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className="tb-btn"
                onClick={() => setFontSize(state.fontSize + 2)}
              >
                A+
              </button>
            </TooltipTrigger>
            <TooltipContent>Increase font size</TooltipContent>
          </Tooltip>
        </div>

        <span className="tb-sep" />

        {/* Inline marks */}
        <div className="tb-group">
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.bold)}
                onClick={() => chain().toggleBold().run()}
              >
                <b>B</b>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Bold <Shortcut keys="B" mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.italic)}
                onClick={() => chain().toggleItalic().run()}
              >
                <i>I</i>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Italic <Shortcut keys="I" mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.underline)}
                onClick={() => chain().toggleUnderline().run()}
              >
                <u>U</u>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Underline <Shortcut keys="U" mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.strike)}
                onClick={() => chain().toggleStrike().run()}
              >
                <s>S</s>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Strikethrough <Shortcut keys="S" shift mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.highlight)}
                onClick={() => chain().toggleHighlight().run()}
              >
                <span className="hl-swatch">H</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Highlight <Shortcut keys="H" shift mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.code)}
                onClick={() => chain().toggleCode().run()}
              >
                {"/>"}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Inline code <Shortcut keys="E" mac={isMac} />
            </TooltipContent>
          </Tooltip>
        </div>

        <span className="tb-sep" />

        {/* Blocks */}
        <div className="tb-group">
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.h1)}
                onClick={() => chain().toggleHeading({ level: 1 }).run()}
              >
                H1
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Heading 1 <Shortcut keys="1" alt mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.h2)}
                onClick={() => chain().toggleHeading({ level: 2 }).run()}
              >
                H2
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Heading 2 <Shortcut keys="2" alt mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.h3)}
                onClick={() => chain().toggleHeading({ level: 3 }).run()}
              >
                H3
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Heading 3 <Shortcut keys="3" alt mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.bulletList)}
                onClick={() => chain().toggleBulletList().run()}
              >
                • List
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Bullet list <Shortcut keys="8" shift mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.orderedList)}
                onClick={() => chain().toggleOrderedList().run()}
              >
                1. List
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Numbered list <Shortcut keys="7" shift mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.taskList)}
                onClick={() => chain().toggleTaskList().run()}
              >
                ☑
              </button>
            </TooltipTrigger>
            <TooltipContent>Task list</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.blockquote)}
                onClick={() => chain().toggleBlockquote().run()}
              >
                ❝
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Blockquote <Shortcut keys="B" shift mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className={btn(state.codeBlock)}
                onClick={() => chain().toggleCodeBlock().run()}
              >
                {"{ }"}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Code block <Shortcut keys="C" alt mac={isMac} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className="tb-btn"
                onClick={() => chain().setHorizontalRule().run()}
              >
                ―
              </button>
            </TooltipTrigger>
            <TooltipContent>Horizontal rule</TooltipContent>
          </Tooltip>
        </div>

        <span className="tb-sep" />

        {/* Insert */}
        <div className="tb-group">
          <Tooltip>
            <TooltipTrigger>
              <button
                className="tb-btn"
                onClick={() => imageInputRef.current?.click()}
              >
                🖼 Image
              </button>
            </TooltipTrigger>
            <TooltipContent>Insert image</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <button
                className="tb-btn"
                onClick={() => chain().insertMermaid().run()}
              >
                ◈ Diagram
              </button>
            </TooltipTrigger>
            <TooltipContent>Insert Mermaid diagram</TooltipContent>
          </Tooltip>
        </div>

        <span className="tb-flex" />

        <Tooltip>
          <TooltipTrigger>
            <button className={btn(showMarkdown)} onClick={onToggleMarkdown}>
              Ⓜ Markdown
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle Markdown source pane</TooltipContent>
        </Tooltip>

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
    </TooltipProvider>
  );
}
