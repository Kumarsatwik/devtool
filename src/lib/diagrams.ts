"use client";

export type DiagramKind = "mermaid";

let mermaidReady = false;
let renderSeq = 0;

export async function renderMermaidSvg(code: string): Promise<string> {
  // lazy: mermaid is ~1MB; only loaded when a mermaid diagram actually renders
  const mermaid = (await import("mermaid")).default;
  if (!mermaidReady) {
    mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
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

