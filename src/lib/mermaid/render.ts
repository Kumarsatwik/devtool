"use client";

import type { MermaidConfig } from "mermaid";

/** Notes render untrusted Markdown, so they always use strict security. */
export const NOTES_MERMAID_CONFIG: MermaidConfig = {
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "strict",
};

let renderSeq = 0;

export async function renderMermaidSvg(
  code: string,
  config: MermaidConfig = NOTES_MERMAID_CONFIG,
): Promise<string> {
  // lazy: mermaid is ~1MB; only loaded when a mermaid diagram actually renders
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize(config);
  const id = `mermaid-svg-${++renderSeq}`;
  const { svg } = await mermaid.render(id, code);
  return svg;
}
