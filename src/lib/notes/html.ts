import { escapeHtml } from "./markdown.ts";

/** Note documents allow inline styling and embedded media, but no scripts or remote resources. */
export const NOTE_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
].join("; ");

export interface DocumentOptions {
  /** Markup injected into <head> — used by the preview to retarget links. */
  headHtml?: string;
  /** Extra CSS appended after the shared export styles. */
  css?: string;
}

export const EXPORT_CSS = `
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

export function sanitizeFilename(name: string): string {
  return (name.trim() || "note").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
}

export function buildDocument(
  title: string,
  bodyHtml: string,
  { headHtml = "", css = "" }: DocumentOptions = {},
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${NOTE_CSP}">
${headHtml}<title>${escapeHtml(title)}</title>
<style>${EXPORT_CSS}${css}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function buildNoteHeading(title: string): string {
  return `<h1>${escapeHtml(title)}</h1>`;
}
