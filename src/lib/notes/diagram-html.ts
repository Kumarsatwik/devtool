"use client";

import { renderDiagramSvg } from "@/lib/diagrams";

/**
 * Shared diagram resolution for every HTML-based note rendering path
 * (HTML export, fullscreen preview, slide deck, DOCX export).
 * Diagrams stay in the same pipeline so all destinations always show
 * identical output.
 */

/** Rasterize an SVG string to a PNG data URL (needed for DOCX fidelity). */
export async function svgToPngDataUrl(
  svg: string,
  scale = 2,
  background = "#ffffff",
): Promise<string> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:0;";
  container.innerHTML = svg;
  document.body.appendChild(container);
  const svgEl = container.querySelector("svg") as SVGSVGElement | null;
  const rect = svgEl?.getBoundingClientRect?.() ?? { width: 400, height: 200 };
  const width = Math.max(rect.width || 400, 100);
  const height = Math.max(rect.height || 200, 60);
  if (svgEl) {
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));
  }
  const xml = new XMLSerializer().serializeToString(svgEl || container);
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
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export interface ResolveDiagramOptions {
  mode?: "svg" | "png";
  scale?: number;
  background?: string;
}

/**
 * Replace diagram code blocks in editor HTML with rendered diagrams.
 * Renders sequentially: mermaid keeps global render state, so parallel
 * renders would race and produce corrupt SVGs.
 */
export async function resolveDiagrams(
  html: string,
  options: ResolveDiagramOptions = {},
): Promise<string> {
  const { mode = "svg", scale = 2, background = "#ffffff" } = options;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = Array.from(
    doc.querySelectorAll('pre[data-type="mermaid"]'),
  );
  for (const block of blocks) {
    const code = block.textContent ?? "";
    if (!code.trim()) {
      block.remove();
      continue;
    }
    try {
      const svg = await renderDiagramSvg("mermaid", code);
      const wrapper = doc.createElement("div");
      wrapper.className = "mermaid-diagram";
      if (mode === "png") {
        const png = await svgToPngDataUrl(svg, scale, background);
        const img = doc.createElement("img");
        img.src = png;
        img.alt = "Mermaid diagram";
        img.style.maxWidth = "100%";
        wrapper.appendChild(img);
      } else {
        wrapper.innerHTML = svg;
      }
      block.replaceWith(wrapper);
    } catch {
      // keep the raw code block if the diagram fails to render
      block.removeAttribute("data-type");
    }
  }
  return doc.body.innerHTML;
}
