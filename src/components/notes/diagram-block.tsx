"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { detectDiagramKind, renderDiagramSvg, type DiagramKind } from "@/lib/diagrams";
import { plantUmlBackground } from "@/lib/plantuml";

const PLACEHOLDERS: Record<DiagramKind, string> = {
  mermaid: "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[OK]\n  B -->|No| D[Retry]",
  plantuml: "@startuml\nAlice -> Bob: Hello\n@enduml",
};

/* ---------------- React node view ---------------- */

function DiagramView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const declared: DiagramKind = node.attrs.language === "plantuml" ? "plantuml" : "mermaid";
  const code: string = node.attrs.code ?? "";
  const [editing, setEditing] = useState(code.trim() === "");
  const [draft, setDraft] = useState(code);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // The kind follows the code, so typing @startuml flips a block to PlantUML
  const kind = detectDiagramKind(editing ? draft : code, declared);

  // The toolbar refocuses ProseMirror after inserting, which beats the
  // textarea's autoFocus; focus it here once the editor is mounted.
  // Focus the code editor on insert/edit. Inserting runs without the
  // toolbar's focus() command so nothing steals this back.
  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  // Live render (also while typing in the code editor)
  useEffect(() => {
    const source = editing ? draft : code;
    if (!source.trim()) {
      setSvg("");
      setError(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      renderDiagramSvg(kind, source)
        .then((s) => {
          if (!cancelled) {
            setSvg(s);
            setError(null);
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
          // mermaid may leave an orphan error element behind
          document.querySelectorAll('body > [id^="mermaid-svg-"]').forEach((n) => n.remove());
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [kind, code, draft, editing]);

  const save = useCallback(() => {
    updateAttributes({ code: draft });
    setEditing(false);
  }, [draft, updateAttributes]);

  return (
    <NodeViewWrapper
      className={`mermaid-block ${selected ? "is-selected" : ""}`}
      data-type={kind}
    >
      <div className="mermaid-block-header" contentEditable={false}>
        <span className="mermaid-badge">{kind === "plantuml" ? "PlantUML" : "Mermaid"}</span>
        {editing ? (
          <button className="mermaid-btn" onMouseDown={(e) => e.preventDefault()} onClick={save}>
            Done
          </button>
        ) : (
          editor.isEditable && (
            <button
              className="mermaid-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDraft(code);
                setEditing(true);
              }}
            >
              Edit
            </button>
          )
        )}
      </div>
      {editing && (
        <div contentEditable={false}>
          <textarea
            ref={editorRef}
            className="mermaid-editor"
            value={draft}
            rows={Math.max(4, draft.split("\n").length + 1)}
            placeholder={PLACEHOLDERS[kind]}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
      )}
      <div
        className="mermaid-preview"
        contentEditable={false}
        ref={previewRef}
        style={kind === "plantuml" && svg ? { background: plantUmlBackground(svg) } : undefined}
      >
        {error ? (
          <pre className="mermaid-error">{error}</pre>
        ) : svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <span className="mermaid-placeholder">
            Empty diagram — click Edit and type {kind === "plantuml" ? "PlantUML" : "Mermaid"} code
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/* ---------------- TipTap node ---------------- */

export const DiagramBlock = Node.create({
  name: "diagramBlock",
  group: "block",
  atom: true,
  draggable: true,
  // Must win over StarterKit's codeBlock when parsing <pre> tags
  priority: 1000,

  addAttributes() {
    return {
      code: { default: "" },
      language: { default: "mermaid" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-type="mermaid"]',
        priority: 100,
        getAttrs: (el) => ({
          code: (el as HTMLElement).textContent ?? "",
          language: "mermaid",
        }),
      },
      {
        tag: 'pre[data-type="plantuml"]',
        priority: 100,
        getAttrs: (el) => ({
          code: (el as HTMLElement).textContent ?? "",
          language: "plantuml",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = detectDiagramKind(
      node.attrs.code as string,
      node.attrs.language === "plantuml" ? "plantuml" : "mermaid",
    );
    return [
      "pre",
      mergeAttributes(HTMLAttributes, { "data-type": kind }),
      ["code", {}, node.attrs.code as string],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramView, {
      // Let the code textarea / buttons handle their own keyboard & mouse
      // events instead of ProseMirror hijacking them.
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null;
        return !!target?.closest("textarea, button, .mermaid-editor");
      },
    });
  },

  addCommands() {
    return {
      insertMermaid:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { code: "", language: "mermaid" } }),
      insertPlantUml:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { code: "", language: "plantuml" } }),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    diagram: {
      insertMermaid: () => ReturnType;
      insertPlantUml: () => ReturnType;
    };
  }
}
