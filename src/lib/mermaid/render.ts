"use client";

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
