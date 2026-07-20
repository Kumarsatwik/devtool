"use client";

import { saveAs } from "file-saver";

export const MARKDOWN_CSS = `
  .markdown-body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: #0a0a0a;
    background: transparent;
    max-width: none;
  }
  .markdown-body h1,
  .markdown-body h2,
  .markdown-body h3,
  .markdown-body h4,
  .markdown-body h5,
  .markdown-body h6 {
    margin-top: 1.5em;
    margin-bottom: 0.6em;
    font-weight: 600;
    line-height: 1.25;
    color: #0a0a0a;
  }
  .markdown-body h1 { font-size: 2em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3em; }
  .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3em; }
  .markdown-body h3 { font-size: 1.25em; }
  .markdown-body h4 { font-size: 1.1em; }
  .markdown-body p { margin-top: 0; margin-bottom: 1em; }
  .markdown-body a { color: #2563eb; text-decoration: underline; }
  .markdown-body a:hover { color: #1d4ed8; }
  .markdown-body ul, .markdown-body ol {
    margin-top: 0;
    margin-bottom: 1em;
    padding-left: 1.5em;
  }
  .markdown-body li { margin-bottom: 0.25em; }
  .markdown-body ul ul, .markdown-body ol ol, .markdown-body ul ol, .markdown-body ol ul { margin-bottom: 0; }
  .markdown-body blockquote {
    margin: 0 0 1em;
    padding: 0.5em 1em;
    border-left: 4px solid #d4d4d4;
    color: #525252;
    background: #f5f5f5;
    border-radius: 0 6px 6px 0;
  }
  .markdown-body blockquote p:last-child { margin-bottom: 0; }
  .markdown-body code {
    font-family: "JetBrains Mono", "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875em;
    padding: 0.2em 0.4em;
    background: #f0f0f0;
    border-radius: 4px;
  }
  .markdown-body pre {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 1em;
    overflow-x: auto;
    margin-bottom: 1em;
  }
  .markdown-body pre code {
    background: transparent;
    padding: 0;
    font-size: 0.85em;
    line-height: 1.6;
  }
  .markdown-body table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
  }
  .markdown-body th, .markdown-body td {
    border: 1px solid #d4d4d4;
    padding: 8px 12px;
    text-align: left;
  }
  .markdown-body th {
    background: #f5f5f5;
    font-weight: 600;
  }
  .markdown-body tr:nth-child(even) { background: #fafafa; }
  .markdown-body hr {
    border: 0;
    border-top: 1px solid #e5e5e5;
    margin: 2em 0;
  }
  .markdown-body img { max-width: 100%; height: auto; border-radius: 6px; }
  .markdown-body input[type="checkbox"] { margin-right: 0.5em; }

  @media (prefers-color-scheme: dark) {
    .markdown-body { color: #e5e5e5; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { color: #e5e5e5; }
    .markdown-body h1, .markdown-body h2 { border-bottom-color: #404040; }
    .markdown-body a { color: #60a5fa; }
    .markdown-body a:hover { color: #93c5fd; }
    .markdown-body blockquote { color: #a3a3a3; background: #262626; border-left-color: #525252; }
    .markdown-body code, .markdown-body pre { background: #262626; }
    .markdown-body pre code { background: transparent; }
    .markdown-body th, .markdown-body td { border-color: #404040; }
    .markdown-body th { background: #262626; }
    .markdown-body tr:nth-child(even) { background: #1a1a1a; }
    .markdown-body hr { border-top-color: #404040; }
  }

  .dark .markdown-body { color: #e5e5e5; }
  .dark .markdown-body h1, .dark .markdown-body h2, .dark .markdown-body h3, .dark .markdown-body h4, .dark .markdown-body h5, .dark .markdown-body h6 { color: #e5e5e5; }
  .dark .markdown-body h1, .dark .markdown-body h2 { border-bottom-color: #404040; }
  .dark .markdown-body a { color: #60a5fa; }
  .dark .markdown-body a:hover { color: #93c5fd; }
  .dark .markdown-body blockquote { color: #a3a3a3; background: #262626; border-left-color: #525252; }
  .dark .markdown-body code, .dark .markdown-body pre { background: #262626; }
  .dark .markdown-body pre code { background: transparent; }
  .dark .markdown-body th, .dark .markdown-body td { border-color: #404040; }
  .dark .markdown-body th { background: #262626; }
  .dark .markdown-body tr:nth-child(even) { background: #1a1a1a; }
  .dark .markdown-body hr { border-top-color: #404040; }

`;

const WRAPPER_STYLES = `<style>${MARKDOWN_CSS}</style>`;

export function exportMarkdownHtml(container: HTMLElement, filename = "document.html") {
  const previewEl = container.querySelector("[data-markdown-body]");
  if (!previewEl) throw new Error("No rendered content found");

  const title = document.title || "Markdown Preview";
  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${WRAPPER_STYLES}
</head>
<body>
  ${previewEl.innerHTML}
</body>
</html>`.trim();

  const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" });
  saveAs(blob, filename);
}
