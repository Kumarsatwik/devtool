"use client";

import { marked } from "marked";
import TurndownService from "turndown";
// @ts-expect-error - no type definitions shipped for turndown-plugin-gfm
import { gfm } from "turndown-plugin-gfm";

/* ---------------- Markdown -> HTML (for loading .md into the editor) ---------------- */

// ==highlight== support
function preprocessMarkdown(md: string): string {
  return md.replace(/==([^=\n]+)==/g, "<mark>$1</mark>");
}

export function markdownToHtml(md: string): string {
  const renderer = new marked.Renderer();
  const origCode = renderer.code.bind(renderer);
  renderer.code = (token) => {
    if (token.lang === "mermaid") {
      // Rendered by the MermaidBlock node in the editor
      return `<pre data-type="mermaid"><code>${escapeHtml(token.text)}</code></pre>\n`;
    }
    return origCode(token);
  };
  return marked.parse(preprocessMarkdown(md), {
    renderer,
    gfm: true,
    breaks: false,
    async: false,
  }) as string;
}

/* ---------------- HTML -> Markdown (for saving editor content as .md) ---------------- */

let turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (turndown) return turndown;

  turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    bulletListMarker: "-",
  });
  turndown.use(gfm);

  // Never leak CSS/JS into the markdown output
  turndown.remove(["style", "script"]);

  // Preserve underline (no markdown equivalent -> inline HTML)
  turndown.addRule("underline", {
    filter: ["u"],
    replacement: (content) => `<u>${content}</u>`,
  });

  // mark -> ==highlight==
  turndown.addRule("highlight", {
    filter: ["mark"],
    replacement: (content) => `==${content}==`,
  });

  // Mermaid blocks -> fenced code with mermaid language
  turndown.addRule("mermaid", {
    filter: (node) =>
      node.nodeName === "PRE" && (node as HTMLElement).getAttribute("data-type") === "mermaid",
    replacement: (_content, node) => {
      const code = (node as HTMLElement).textContent ?? "";
      return `\n\n\`\`\`mermaid\n${code.trim()}\n\`\`\`\n\n`;
    },
  });

  // Task list items -> - [ ] / - [x]
  turndown.addRule("taskItem", {
    filter: (node) =>
      node.nodeName === "LI" && (node as HTMLElement).getAttribute("data-type") === "taskItem",
    replacement: (content, node) => {
      const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
      const text = content.replace(/^\s+|\s+$/g, "").replace(/\n/gm, "\n    ");
      return `- [${checked ? "x" : " "}] ${text}\n`;
    },
  });

  return turndown;
}

export function htmlToMarkdown(html: string): string {
  return getTurndown().turndown(html);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
