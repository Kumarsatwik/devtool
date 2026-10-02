import { saveAs } from "file-saver";
import { htmlToMarkdown } from "./markdown";
import { resolveDiagrams } from "./diagram-html";

/* ---------------- helpers ---------------- */

function sanitizeFilename(name: string): string {
  return (name.trim() || "note").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
}

const EXPORT_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         color: #1f2328; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 24px; }
  h1, h2, h3, h4 { line-height: 1.3; margin-top: 1.4em; margin-bottom: .5em; }
  h1 { font-size: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: .3em; }
  h2 { font-size: 1.5em; }
  img { max-width: 100%; height: auto; border-radius: 4px; }
  pre { background: #f6f8fa; padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
  code { background: #f0f1f3; padding: .15em .35em; border-radius: 4px;
         font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; }
  pre code { background: transparent; padding: 0; }
  blockquote { border-left: 4px solid #d0d7de; margin: 1em 0; padding: .2em 1em; color: #57606a; }
  mark { background: #fff3a3; padding: 0 .15em; border-radius: 2px; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #d0d7de; padding: 6px 12px; text-align: left; }
  th { background: #f6f8fa; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
  ul[data-type="taskList"] { list-style: none; padding-left: .4em; }
  ul[data-type="taskList"] li { display: flex; gap: .5em; align-items: baseline; }
  .mermaid-diagram { margin: 1.2em 0; text-align: center; }
  .mermaid-diagram svg { max-width: 100%; height: auto; }
`;

interface DocumentOptions {
  /** Markup injected into <head> — used by the preview to retarget links. */
  headHtml?: string;
  /** Extra CSS appended after the shared export styles. */
  css?: string;
}

function buildDocument(
  title: string,
  bodyHtml: string,
  { headHtml = "", css = "" }: DocumentOptions = {},
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headHtml}<title>${title}</title>
<style>${EXPORT_CSS}${css}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export type PreviewTheme = "default" | "dark" | "github" | "serif" | "sepia";

export const PREVIEW_THEMES: Record<
  PreviewTheme,
  { label: string; bg: string; text: string; css: string; headHtml?: string }
> = {
  default: {
    label: "Clean Light",
    bg: "#ffffff",
    text: "#0f172a",
    css: `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: #ffffff;
        color: #0f172a;
        font-size: 16px;
        line-height: 1.65;
      }
      h1, h2, h3, h4, h5, h6 {
        color: #0f172a;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      h1 {
        font-size: 2.2em;
        border-bottom: 2px solid #f1f5f9;
        padding-bottom: 0.3em;
        margin-top: 0.5em;
      }
      h2 {
        font-size: 1.6em;
        margin-top: 1.5em;
      }
      a {
        color: #2563eb;
        text-decoration: underline;
        text-decoration-thickness: 1.5px;
        text-underline-offset: 3px;
      }
      a:hover {
        color: #1d4ed8;
      }
      pre {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      code {
        background: #f1f5f9;
        color: #0f172a;
        border: 1px solid #e2e8f0;
        padding: 0.15em 0.35em;
        border-radius: 4px;
      }
      blockquote {
        border-left: 4px solid #3b82f6;
        background: #eff6ff;
        color: #1e3a8a;
        border-radius: 0 6px 6px 0;
        padding: 0.8em 1.2em;
      }
      table th, table td {
        border: 1px solid #e2e8f0;
        padding: 8px 14px;
      }
      table th {
        background: #f8fafc;
        color: #0f172a;
        font-weight: 600;
      }
    `,
  },
  dark: {
    label: "Midnight",
    bg: "#0d1117",
    text: "#e6edf3",
    css: `
      body { background: #0d1117; color: #e6edf3; }
      h1, h2, h3, h4, h5, h6 { color: #f0f6fc; }
      h1 { border-bottom-color: #30363d; }
      pre { background: #161b22; border: 1px solid #30363d; color: #e6edf3; }
      code { background: #21262d; color: #e6edf3; }
      blockquote { border-left-color: #388bfd; color: #8b949e; background: rgba(56, 139, 253, 0.08); }
      table th, table td { border-color: #30363d; }
      table th { background: #161b22; color: #f0f6fc; }
      hr { border-top-color: #30363d; }
      mark { background: #9e6a03; color: #ffffff; }
      a { color: #58a6ff; }
      .mermaid-diagram { background: #161b22; padding: 16px; border-radius: 8px; border: 1px solid #30363d; }
    `,
  },
  github: {
    label: "GitHub",
    bg: "#ffffff",
    text: "#1f2328",
    css: `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
        background: #ffffff;
        color: #1f2328;
        font-size: 16px;
        line-height: 1.5;
        word-wrap: break-word;
      }
      h1, h2, h3, h4, h5, h6 {
        color: #1f2328;
        font-weight: 600;
        line-height: 1.25;
        margin-top: 24px;
        margin-bottom: 16px;
      }
      h1 {
        font-size: 2em;
        border-bottom: 1px solid #d0d7de;
        padding-bottom: 0.3em;
      }
      h2 {
        font-size: 1.5em;
        border-bottom: 1px solid #d0d7de;
        padding-bottom: 0.3em;
      }
      h3 { font-size: 1.25em; }
      h4 { font-size: 1em; }
      a {
        color: #0969da;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      pre {
        background-color: #f6f8fa;
        border: 1px solid #d0d7de;
        border-radius: 6px;
        padding: 16px;
        font-size: 85%;
        line-height: 1.45;
        overflow: auto;
      }
      code {
        background-color: rgba(175, 184, 193, 0.2);
        padding: 0.2em 0.4em;
        border-radius: 6px;
        font-size: 85%;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      }
      pre code {
        background-color: transparent;
        padding: 0;
      }
      blockquote {
        border-left: 0.25em solid #d0d7de;
        color: #57606a;
        padding: 0 1em;
        margin: 16px 0;
        background: transparent;
      }
      table {
        border-spacing: 0;
        border-collapse: collapse;
        margin: 16px 0;
        width: 100%;
        display: block;
        overflow: auto;
      }
      table th, table td {
        border: 1px solid #d0d7de;
        padding: 6px 13px;
      }
      table th {
        font-weight: 600;
        background-color: #f6f8fa;
      }
      table tr:nth-child(2n) {
        background-color: #f6f8fa;
      }
      hr {
        height: 0.25em;
        padding: 0;
        margin: 24px 0;
        background-color: #d0d7de;
        border: 0;
      }
      mark {
        background-color: rgba(234, 197, 23, 0.4);
        padding: 0.1em 0.2em;
        border-radius: 3px;
      }
      .mermaid-diagram {
        background: #f6f8fa;
        border: 1px solid #d0d7de;
        border-radius: 6px;
        padding: 20px;
      }
    `,
  },
  serif: {
    label: "Editorial",
    bg: "#f7f4ec",
    text: "#24201d",
    headHtml: `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
`,
    css: `
      html, body {
        background: #f7f4ec !important;
      }
      body {
        font-family: "Newsreader", "Sitka Text", Cambria, Georgia, serif;
        background: #f7f4ec;
        color: #24201d;
        font-size: 20px;
        line-height: 1.85;
        letter-spacing: 0.012em;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: "Playfair Display", "Sitka Heading", Georgia, serif;
        color: #1a1614;
        font-weight: 700;
        line-height: 1.25;
      }
      h1 {
        font-size: 2.6em;
        letter-spacing: -0.02em;
        border-bottom: 2px solid #dfd8c8;
        padding-bottom: 0.35em;
        margin-top: 0.6em;
        margin-bottom: 0.8em;
      }
      h2 {
        font-size: 1.75em;
        font-style: italic;
        font-weight: 600;
        color: #3d352e;
        margin-top: 1.8em;
        margin-bottom: 0.6em;
        border-bottom: 1px solid #e8e2d4;
        padding-bottom: 0.25em;
      }
      h3 {
        font-size: 1.35em;
        color: #4a4139;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      p {
        margin: 1.3em 0;
      }
      a {
        color: #b45309;
        text-decoration: underline;
        text-decoration-thickness: 1.5px;
        text-underline-offset: 4px;
        text-decoration-color: #d97706;
        transition: color 0.15s ease;
      }
      a:hover {
        color: #d97706;
      }
      blockquote {
        border-left: 4px solid #b45309;
        margin: 2em 0;
        padding: 1.2em 1.8em;
        background: #efe8dc;
        border-radius: 0 8px 8px 0;
        font-style: italic;
        font-size: 1.08em;
        color: #3a322b;
        line-height: 1.75;
      }
      blockquote p {
        margin: 0.4em 0;
      }
      pre {
        background: #efe8dc;
        border: 1px solid #ddd3c0;
        border-radius: 6px;
        padding: 18px 22px;
        font-size: 0.86em;
        line-height: 1.6;
        color: #2d2621;
      }
      code {
        font-family: "JetBrains Mono", ui-monospace, "Courier New", monospace;
        background: #eee7da;
        border: 1px solid #ded5c3;
        padding: 0.15em 0.45em;
        border-radius: 4px;
        font-size: 0.88em;
        color: #78350f;
      }
      pre code {
        background: transparent;
        border: none;
        padding: 0;
        color: inherit;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 2.2em 0;
        font-size: 0.95em;
        border-top: 2.5px solid #24201d;
        border-bottom: 2.5px solid #24201d;
      }
      table th, table td {
        border: none;
        padding: 10px 16px;
        text-align: left;
      }
      table th {
        border-bottom: 1.5px solid #24201d;
        font-family: "Playfair Display", Georgia, serif;
        font-weight: 700;
        color: #1a1614;
        background: transparent;
        text-transform: uppercase;
        font-size: 0.82em;
        letter-spacing: 0.08em;
      }
      table td {
        border-bottom: 1px solid #e2dac9;
      }
      table tr:last-child td {
        border-bottom: none;
      }
      table tr:nth-child(even) {
        background: rgba(0, 0, 0, 0.018);
      }
      hr {
        border: none;
        border-top: 1px dashed #cfc5b0;
        margin: 3em auto;
        width: 85%;
      }
      mark {
        background: #fed7aa;
        color: #431407;
        padding: 0.1em 0.35em;
        border-radius: 3px;
      }
      .mermaid-diagram {
        background: #ffffff;
        border: 1px solid #ded5c3;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
      }
    `,
  },
  sepia: {
    label: "Warm Sepia",
    bg: "#f5eedb",
    text: "#433422",
    css: `
      body { background: #f5eedb; color: #433422; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      h1 { border-bottom-color: #ded1b8; }
      pre { background: #ede3cc; border: 1px solid #ded1b8; }
      code { background: #e5dac2; color: #3d2f1f; }
      blockquote { border-left-color: #bfa882; color: #634f3a; background: rgba(191, 168, 130, 0.15); }
      table th, table td { border-color: #ded1b8; }
      table th { background: #ede3cc; }
      hr { border-top-color: #ded1b8; }
      a { color: #8f531d; }
    `,
  },
};

/* ---------------- public exporters ---------------- */

/** Diagrams resolved to inline SVG with the note title on top. */
async function buildNoteBody(title: string, editorHtml: string): Promise<string> {
  const body = await resolveDiagrams(editorHtml);
  return `<h1>${title}</h1>\n${body}`;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface BuildNotePreviewOptions {
  theme?: PreviewTheme;
}

/**
 * Standalone HTML document for the fullscreen preview. Uses the same
 * diagram pipeline as `exportAsHtml`, so the preview shows exactly what
 * the HTML export produces. Injects IDs into headings for TOC navigation.
 */
export async function buildNotePreview(
  title: string,
  editorHtml: string,
  options: BuildNotePreviewOptions = {},
): Promise<{ html: string; headings: HeadingItem[] }> {
  const theme = options.theme ?? "default";
  const themeConfig = PREVIEW_THEMES[theme] ?? PREVIEW_THEMES.default;
  const themeCss = themeConfig.css ?? "";
  const themeHead = themeConfig.headHtml ?? "";
  const body = await buildNoteBody(title, editorHtml);
  const doc = new DOMParser().parseFromString(body, "text/html");
  const headingEls = Array.from(doc.querySelectorAll("h1, h2, h3, h4"));
  const headings: HeadingItem[] = [];
  headingEls.forEach((el, index) => {
    const id = `preview-h-${index}`;
    el.setAttribute("id", id);
    headings.push({
      id,
      text: el.textContent?.trim() || `Section ${index + 1}`,
      level: Number(el.tagName.replace(/^H/i, "")) || 1,
    });
  });

  const fullDoc = buildDocument(title, doc.body.innerHTML, {
    headHtml: `<base target="_blank" />\n${themeHead}`,
    css: `
  html { scroll-behavior: smooth; }
  html, body {
    background-color: ${themeConfig.bg} !important;
  }
  body {
    max-width: 100% !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 24px 40px !important;
    box-sizing: border-box !important;
  }
  ${themeCss}
  /* Preview-only: a printed preview should use the full page */
  @media print { body { max-width: none; margin: 0; padding: 0; background: #fff !important; color: #000 !important; } }
`,
  });

  return { html: fullDoc, headings };
}

export async function exportAsHtml(title: string, editorHtml: string): Promise<void> {
  const doc = buildDocument(title, await buildNoteBody(title, editorHtml));
  saveAs(new Blob([doc], { type: "text/html;charset=utf-8" }), `${sanitizeFilename(title)}.html`);
}

export async function exportAsDocx(title: string, editorHtml: string): Promise<void> {
  const { asBlob } = await import("html-docx-js-typescript");
  const body = await resolveDiagrams(editorHtml, { mode: "png" });
  const doc = buildDocument(title, `<h1>${title}</h1>\n${body}`);
  const blob = await asBlob(doc, { orientation: "portrait" });
  saveAs(blob as Blob, `${sanitizeFilename(title)}.docx`);
}

export function exportAsMarkdown(title: string, editorHtml: string): void {
  const md = `# ${title}\n\n${htmlToMarkdown(editorHtml)}\n`;
  saveAs(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${sanitizeFilename(title)}.md`);
}

export function exportAsTxt(title: string, editorHtml: string): void {
  const doc = new DOMParser().parseFromString(editorHtml, "text/html");
  // Represent diagrams by their source code in plain text
  doc.querySelectorAll('pre[data-type="mermaid"]').forEach((el) => {
    el.textContent = `[Mermaid diagram]\n${el.textContent ?? ""}\n`;
  });
  doc.querySelectorAll("img").forEach((img) => {
    img.replaceWith(doc.createTextNode(`[Image: ${img.alt || "embedded image"}]`));
  });
  doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, tr").forEach((el) => {
    el.append(doc.createTextNode("\n"));
  });
  const text = `${title}\n${"=".repeat(title.length)}\n\n${(doc.body.textContent ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
  saveAs(new Blob([text], { type: "text/plain;charset=utf-8" }), `${sanitizeFilename(title)}.txt`);
}
