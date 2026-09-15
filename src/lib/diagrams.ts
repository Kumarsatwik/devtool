"use client";

import { fetchPlantUmlSvg } from "./plantuml.ts";

export type DiagramKind = "mermaid" | "plantuml";

let mermaidReady = false;
let renderSeq = 0;

async function renderMermaidSvg(code: string): Promise<string> {
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

export function renderDiagramSvg(kind: DiagramKind, code: string): Promise<string> {
  return kind === "plantuml" ? fetchPlantUmlSvg(code) : renderMermaidSvg(code);
}

/**
 * Pick the renderer from the code itself. PlantUML sources are wrapped in
 * @start…/@end… markers, which Mermaid never uses; anything else falls back
 * to the kind the diagram was created with.
 * ponytail: marker heuristic — upgrade to a real parser if unwrapped
 * PlantUML (no @startuml) ever needs to be auto-detected.
 */
export function detectDiagramKind(code: string, fallback: DiagramKind): DiagramKind {
  return /^\s*@(start|end)\w+/m.test(code) ? "plantuml" : fallback;
}
