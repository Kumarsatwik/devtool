"use client";

import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";

function getSvgElement(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector("svg");
}

function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const styles = getComputedStyles();
  if (styles) {
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = styles;
    clone.insertBefore(styleEl, clone.firstChild);
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

function getComputedStyles(): string {
  const styleSheets = Array.from(document.styleSheets);
  let css = "";
  for (const sheet of styleSheets) {
    try {
      const rules = Array.from(sheet.cssRules || sheet.rules || []);
      for (const rule of rules) {
        css += rule.cssText + "\n";
      }
    } catch {
      // Cross-origin stylesheets can't be read; skip them.
    }
  }
  return css;
}

function svgToDataUrl(svgXml: string): string {
  const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
  return URL.createObjectURL(blob);
}

async function svgToCanvas(
  svgXml: string,
  type: "image/png" | "image/jpeg",
  scale = 2,
): Promise<{ canvas: HTMLCanvasElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const url = svgToDataUrl(svgXml);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not create canvas context"));
        return;
      }

      if (type === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ canvas, cleanup: () => URL.revokeObjectURL(url) });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render SVG to image"));
    };

    img.src = url;
  });
}

export async function exportMermaidSvg(container: HTMLElement, filename = "diagram.svg") {
  const svg = getSvgElement(container);
  if (!svg) throw new Error("No diagram found to export");

  const svgXml = serializeSvg(svg);
  const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
  saveAs(blob, filename);
}

export async function exportMermaidImage(
  container: HTMLElement,
  format: "png" | "jpg",
  filename?: string,
) {
  const svg = getSvgElement(container);
  if (!svg) throw new Error("No diagram found to export");

  const svgXml = serializeSvg(svg);
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const { canvas, cleanup } = await svgToCanvas(svgXml, mimeType);

  const extension = format === "png" ? "png" : "jpg";
  const defaultName = `diagram.${extension}`;

  const dataUrl = canvas.toDataURL(mimeType, 1.0);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename || defaultName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  cleanup();
}

export async function exportMermaidPdf(container: HTMLElement, filename = "diagram.pdf") {
  const svg = getSvgElement(container);
  if (!svg) throw new Error("No diagram found to export");

  const svgXml = serializeSvg(svg);
  const { canvas, cleanup } = await svgToCanvas(svgXml, "image/png");

  const imgData = canvas.toDataURL("image/png");
  const pxWidth = canvas.width;
  const pxHeight = canvas.height;

  const ptWidth = pxWidth * 0.75;
  const ptHeight = pxHeight * 0.75;

  const doc = new jsPDF({
    orientation: ptWidth > ptHeight ? "landscape" : "portrait",
    unit: "pt",
    format: [ptWidth, ptHeight],
  });

  doc.addImage(imgData, "PNG", 0, 0, ptWidth, ptHeight);
  doc.save(filename);

  cleanup();
}
