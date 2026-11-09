"use client";

export type DiagramKind = "mermaid";

let mermaidReady = false;
let renderSeq = 0;

export async function renderMermaidSvg(code: string): Promise<string> {
  // lazy: mermaid is ~1MB; only loaded when a mermaid diagram actually renders
  const mermaid = (await import("mermaid")).default;
  if (!mermaidReady) {
    // "strict" (not "loose"): loose mode skips Mermaid's URL sanitizing and
    // final DOMPurify pass, so a diagram link like `click A href
    // "javascript:alert(1)"` would become a clickable XSS payload once the
    // SVG is inserted with innerHTML.
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "strict",
    });
    mermaidReady = true;
  }
  const id = `mermaid-svg-${++renderSeq}`;
  const { svg } = await mermaid.render(id, code);
  return svg;
}

export function renderDiagramSvg(_kind: DiagramKind, code: string): Promise<string> {
  return renderMermaidSvg(code);
}

export function detectDiagramKind(_code: string, fallback: DiagramKind = "mermaid"): DiagramKind {
  return fallback;
}

