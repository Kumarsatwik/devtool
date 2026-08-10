"use client";

import { saveAs } from "file-saver";
import { htmlToMarkdown } from "./markdown";
import { renderMermaidSvg } from "@/components/notes/mermaid-block";

/* ---------------- helpers ---------------- */

function sanitizeFilename(name: string): string {
  return (name.trim() || "note").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
}

/** Rasterize an SVG string to a PNG data URL (needed for DOCX/PDF fidelity). */
async function svgToPngDataUrl(svg: string, scale = 2): Promise<string> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:0;";
  container.innerHTML = svg;
  document.body.appendChild(container);
  const svgEl = container.querySelector("svg") as SVGSVGElement;
  const rect = svgEl.getBoundingClientRect();
  const width = Math.max(rect.width, 100);
  const height = Math.max(rect.height, 60);
  svgEl.setAttribute("width", String(width));
  svgEl.setAttribute("height", String(height));
  const xml = new XMLSerializer().serializeToString(svgEl);
  document.body.removeChild(container);

  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to rasterize diagram"));
    img.src = svgUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

/**
 * Replace mermaid code blocks in editor HTML with rendered diagrams.
 * mode 'svg'  -> inline SVG (great for standalone HTML export)
 * mode 'png'  -> <img> with PNG data URL (needed for DOCX)
 */
async function resolveMermaid(html: string, mode: "svg" | "png"): Promise<string> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = Array.from(doc.querySelectorAll('pre[data-type="mermaid"]'));
  for (const block of blocks) {
    const code = block.textContent ?? "";
    if (!code.trim()) {
      block.remove();
      continue;
    }
    try {
      const svg = await renderMermaidSvg(code);
      const wrapper = doc.createElement("div");
      wrapper.className = "mermaid-diagram";
      if (mode === "svg") {
        wrapper.innerHTML = svg;
      } else {
        const png = await svgToPngDataUrl(svg);
        const img = doc.createElement("img");
        img.src = png;
        img.alt = "Mermaid diagram";
        img.style.maxWidth = "100%";
        wrapper.appendChild(img);
      }
      block.replaceWith(wrapper);
    } catch {
      // keep the raw code block if the diagram fails to render
      block.removeAttribute("data-type");
    }
  }
  return doc.body.innerHTML;
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

function buildDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/* ---------------- public exporters ---------------- */

export async function exportAsHtml(title: string, editorHtml: string): Promise<void> {
  const body = await resolveMermaid(editorHtml, "svg");
  const doc = buildDocument(title, `<h1>${title}</h1>\n${body}`);
  saveAs(new Blob([doc], { type: "text/html;charset=utf-8" }), `${sanitizeFilename(title)}.html`);
}

export async function exportAsDocx(title: string, editorHtml: string): Promise<void> {
  const { asBlob } = await import("html-docx-js-typescript");
  const body = await resolveMermaid(editorHtml, "png");
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
  // Represent mermaid diagrams by their source code in plain text
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
