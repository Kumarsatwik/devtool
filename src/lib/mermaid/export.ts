"use client";

import { saveAs } from "file-saver";

function getSvgElement(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector("svg");
}

interface SerializedSvg {
  xml: string;
  width: number;
  height: number;
}

function serializeSvg(svg: SVGSVGElement): SerializedSvg {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  // Mermaid emits width="100%" with a viewBox; rasterizing needs explicit
  // pixel dimensions, otherwise the browser falls back to 300x150.
  const viewBox = svg.viewBox?.baseVal;
  const rect = svg.getBoundingClientRect();
  const width = Math.ceil(viewBox?.width || rect.width || 800);
  const height = Math.ceil(viewBox?.height || rect.height || 600);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.style.maxWidth = "";

  // Mermaid embeds its own <style> (theme + themeCSS) inside the SVG,
  // so no document stylesheets need to be injected.
  const serializer = new XMLSerializer();
  return { xml: serializer.serializeToString(clone), width, height };
}

async function svgToCanvas(
  { xml, width, height }: SerializedSvg,
  type: "image/png" | "image/jpeg",
  scale = 2,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    // Data URL keeps the canvas untainted and avoids blob revocation races.
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create canvas context"));
        return;
      }

      if (type === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };

    img.onerror = () => {
      reject(new Error("Failed to render SVG to image"));
    };

    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode diagram image"));
      },
      type,
      0.95,
    );
  });
}

export async function exportMermaidSvg(container: HTMLElement, filename = "diagram.svg") {
  const svg = getSvgElement(container);
  if (!svg) throw new Error("No diagram found to export");

  const { xml } = serializeSvg(svg);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  saveAs(blob, filename);
}

export async function exportMermaidImage(
  container: HTMLElement,
  format: "png" | "jpg",
  filename?: string,
) {
  const svg = getSvgElement(container);
  if (!svg) throw new Error("No diagram found to export");

  const serialized = serializeSvg(svg);
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const canvas = await svgToCanvas(serialized, mimeType);
  const blob = await canvasToBlob(canvas, mimeType);

  saveAs(blob, filename || `diagram.${format}`);
}

export async function copyMermaidImage(container: HTMLElement) {
  const svg = getSvgElement(container);
  if (!svg) throw new Error("No diagram found to copy");
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Copying images is not supported in this browser");
  }

  const serialized = serializeSvg(svg);
  // Passing a promise keeps clipboard.write() inside the user gesture, which
  // Safari requires for image writes.
  const pngBlob = svgToCanvas(serialized, "image/png").then((canvas) =>
    canvasToBlob(canvas, "image/png"),
  );

  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": pngBlob }),
  ]);
}
