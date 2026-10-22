"use client";

/**
 * Role-based Mermaid theme system.
 *
 * Each theme maps semantic flowchart roles to colors:
 * - process:  default nodes (rectangles)
 * - decision: diamonds ({...}), auto-detected via the polygon selector
 * - terminal: start/finish pills, tagged with :::flow-start
 * - action:   secondary/debug/success cards, tagged with :::flow-action
 */
export interface DiagramThemeSpec {
  value: string;
  label: string;
  dark?: boolean;
  canvas: string;
  fontFamily: string;
  radius: number;
  border: number;
  terminal: { bg: string; border: string; text: string };
  process: { bg: string; border: string; text: string };
  decision: { bg: string; border: string; text: string };
  action: { bg: string; border: string; text: string };
  connector: string;
}

export const diagramThemes = [
  {
    value: "paper",
    label: "Paper",
    canvas: "#F6F7F4",
    fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    radius: 9,
    border: 1.4,
    terminal: { bg: "#DCEDE4", border: "#67927A", text: "#234A35" },
    process: { bg: "#FFFFFF", border: "#C9D2CC", text: "#26332C" },
    decision: { bg: "#FFF1D1", border: "#D3A44D", text: "#604719" },
    action: { bg: "#EAF0EC", border: "#9BAEA1", text: "#34463A" },
    connector: "#65766B",
  },
  {
    value: "graphite",
    label: "Graphite",
    dark: true,
    canvas: "#15191C",
    fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    radius: 8,
    border: 1.4,
    terminal: { bg: "#284C3B", border: "#5F9A78", text: "#E8F5EC" },
    process: { bg: "#22292D", border: "#465158", text: "#E7ECEE" },
    decision: { bg: "#493B23", border: "#B99755", text: "#F7E8C4" },
    action: { bg: "#26353A", border: "#5E858C", text: "#D8EAEC" },
    connector: "#95A5A7",
  },
  {
    value: "blueprint",
    label: "Blueprint",
    canvas: "#EAF1F5",
    fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
    radius: 4,
    border: 1.5,
    terminal: { bg: "#123B54", border: "#176784", text: "#F2FAFC" },
    process: { bg: "#F8FCFD", border: "#7896A5", text: "#183849" },
    decision: { bg: "#DCECF1", border: "#48859B", text: "#17485D" },
    action: { bg: "#E3EDF0", border: "#7E9DA8", text: "#304E5A" },
    connector: "#476C7B",
  },
  {
    value: "nordic",
    label: "Nordic",
    canvas: "#F1F5F4",
    fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    radius: 10,
    border: 1.25,
    terminal: { bg: "#D9E9E2", border: "#709889", text: "#24493E" },
    process: { bg: "#FCFDFC", border: "#CAD8D3", text: "#2B3C38" },
    decision: { bg: "#E6EEF4", border: "#91A9B8", text: "#344C5C" },
    action: { bg: "#E6F0ED", border: "#A4BDB4", text: "#36564D" },
    connector: "#748B84",
  },
  {
    value: "executive",
    label: "Executive",
    canvas: "#F3F4F6",
    fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    radius: 6,
    border: 1.5,
    terminal: { bg: "#1D3553", border: "#1D3553", text: "#F8FAFC" },
    process: { bg: "#FFFFFF", border: "#C7CFD8", text: "#25364A" },
    decision: { bg: "#F7EBD0", border: "#C69B4B", text: "#604B25" },
    action: { bg: "#E8EDF3", border: "#A9B8C8", text: "#354A61" },
    connector: "#63758A",
  },
  {
    value: "editorial",
    label: "Editorial",
    canvas: "#F7F3EA",
    fontFamily: "Georgia, 'Times New Roman', serif",
    radius: 3,
    border: 1.25,
    terminal: { bg: "#34483C", border: "#34483C", text: "#F8F5EC" },
    process: { bg: "#FFFDF8", border: "#D7CDBB", text: "#342F28" },
    decision: { bg: "#F1E3C7", border: "#B48A53", text: "#5B4328" },
    action: { bg: "#EDE9DF", border: "#B8B09E", text: "#4A453B" },
    connector: "#70685A",
  },
] as const satisfies readonly DiagramThemeSpec[];

export type DiagramTheme = (typeof diagramThemes)[number]["value"];

export const defaultDiagramTheme: DiagramTheme = "paper";

export function getThemeSpec(value: string): DiagramThemeSpec {
  return diagramThemes.find((t) => t.value === value) ?? diagramThemes[0];
}

function buildThemeCSS(spec: DiagramThemeSpec): string {
  return `
  .node rect, .node path { rx: ${spec.radius}px; ry: ${spec.radius}px; stroke-width: ${spec.border}px; }
  .node circle, .node ellipse, .node polygon { stroke-width: ${spec.border}px; }
  .node:not(.flow-start):not(.flow-action) rect { fill: ${spec.process.bg} !important; stroke: ${spec.process.border} !important; }
  .node:not(.flow-start):not(.flow-action):not(:has(polygon)) .nodeLabel { color: ${spec.process.text} !important; }

  .node polygon { fill: ${spec.decision.bg} !important; stroke: ${spec.decision.border} !important; stroke-width: ${spec.border}px; }
  .node:has(polygon) .nodeLabel { color: ${spec.decision.text} !important; }

  .node.flow-start rect, .node.flow-start path { fill: ${spec.terminal.bg} !important; stroke: ${spec.terminal.border} !important; rx: 20px; ry: 20px; }
  .node.flow-start .nodeLabel { color: ${spec.terminal.text} !important; font-weight: 700; }

  .node.flow-action rect, .node.flow-action path { fill: ${spec.action.bg} !important; stroke: ${spec.action.border} !important; }
  .node.flow-action .nodeLabel { color: ${spec.action.text} !important; }

  .edgePath .path, .flowchart-link { stroke: ${spec.connector} !important; stroke-width: 1.7px; }
  .marker { fill: ${spec.connector} !important; stroke: ${spec.connector} !important; }
  .edgeLabel { border-radius: 4px; }

  .cluster rect { rx: ${spec.radius + 4}px; ry: ${spec.radius + 4}px; stroke-dasharray: 3 4; }
  .label, .nodeLabel { font-weight: 500; }
`;
}

export function getMermaidConfig(value: string) {
  const spec = getThemeSpec(value);
  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    theme: "base" as const,
    themeVariables: {
      darkMode: !!spec.dark,
      background: spec.canvas,
      fontFamily: spec.fontFamily,
      fontSize: "14px",
      primaryColor: spec.process.bg,
      primaryTextColor: spec.process.text,
      primaryBorderColor: spec.process.border,
      secondaryColor: spec.action.bg,
      secondaryTextColor: spec.action.text,
      secondaryBorderColor: spec.action.border,
      tertiaryColor: spec.decision.bg,
      tertiaryTextColor: spec.decision.text,
      tertiaryBorderColor: spec.decision.border,
      lineColor: spec.connector,
      textColor: spec.process.text,
      edgeLabelBackground: spec.canvas,
      clusterBkg: spec.canvas,
      clusterBorder: spec.process.border,
      noteBkgColor: spec.decision.bg,
      noteTextColor: spec.decision.text,
      noteBorderColor: spec.decision.border,
      actorBkg: spec.process.bg,
      actorBorder: spec.process.border,
      actorTextColor: spec.process.text,
      activationBkgColor: spec.action.bg,
      activationBorderColor: spec.action.border,
    },
    themeCSS: buildThemeCSS(spec),
    flowchart: { curve: "basis" as const, padding: 12 },
  };
}
