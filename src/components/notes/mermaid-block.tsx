"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import mermaid from "mermaid";

let mermaidReady = false;
let renderSeq = 0;

export async function renderMermaidSvg(code: string): Promise<string> {
  if (!mermaidReady) {
    mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
    mermaidReady = true;
  }
  const id = `mermaid-svg-${++renderSeq}`;
  const { svg } = await mermaid.render(id, code);
  return svg;
}

/* ---------------- React node view ---------------- */

function MermaidView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const code: string = node.attrs.code ?? "";
  const [editing, setEditing] = useState(code.trim() === "");
  const [draft, setDraft] = useState(code);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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
      renderMermaidSvg(source)
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
  }, [code, draft, editing]);

  const save = useCallback(() => {
    updateAttributes({ code: draft });
    setEditing(false);
  }, [draft, updateAttributes]);

  return (
    <NodeViewWrapper
      className={`mermaid-block ${selected ? "is-selected" : ""}`}
      data-type="mermaid"
    >
      <div className="mermaid-block-header" contentEditable={false}>
        <span className="mermaid-badge">Mermaid</span>
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
            className="mermaid-editor"
            value={draft}
            rows={Math.max(4, draft.split("\n").length + 1)}
            placeholder={"graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[OK]\n  B -->|No| D[Retry]"}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        </div>
      )}
      <div className="mermaid-preview" contentEditable={false} ref={previewRef}>
        {error ? (
          <pre className="mermaid-error">{error}</pre>
        ) : svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <span className="mermaid-placeholder">Empty diagram — click Edit and type Mermaid code</span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/* ---------------- TipTap node ---------------- */

export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,
  draggable: true,
  // Must win over StarterKit's codeBlock when parsing <pre> tags
  priority: 1000,

  addAttributes() {
    return {
      code: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-type="mermaid"]',
        priority: 100,
        getAttrs: (el) => ({ code: (el as HTMLElement).textContent ?? "" }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, { "data-type": "mermaid" }),
      ["code", {}, node.attrs.code as string],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView, {
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
          commands.insertContent({ type: this.name, attrs: { code: "" } }),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaid: () => ReturnType;
    };
  }
}
