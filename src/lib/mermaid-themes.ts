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
    value: "modern-minimal",
    label: "Modern Minimal",
    canvas: "#FFFFFF",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: 8,
    border: 1,
    terminal: { bg: "#D1FAE5", border: "#059669", text: "#065F46" },
    process: { bg: "#FFFFFF", border: "#D1D5DB", text: "#374151" },
    decision: { bg: "#FFFBEB", border: "#F59E0B", text: "#92400E" },
    action: { bg: "#F9FAFB", border: "#9CA3AF", text: "#374151" },
    connector: "#4B5563",
  },
  {
    value: "soft-pastel",
    label: "Soft Pastel",
    canvas: "#FFFFFF",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: 10,
    border: 1.5,
    terminal: { bg: "#DCFCE7", border: "#94A3B8", text: "#166534" },
    process: { bg: "#E0F2FE", border: "#94A3B8", text: "#0C4A6E" },
    decision: { bg: "#FEF9C3", border: "#94A3B8", text: "#854D0E" },
    action: { bg: "#F3E8FF", border: "#94A3B8", text: "#6B21A8" },
    connector: "#64748B",
  },
  {
    value: "blueprint",
    label: "Technical Blueprint",
    canvas: "#EFF3F8",
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace",
    radius: 4,
    border: 1,
    terminal: { bg: "#1E3A8A", border: "#1E40AF", text: "#FFFFFF" },
    process: { bg: "#FFFFFF", border: "#475569", text: "#334155" },
    decision: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
    action: { bg: "#E0E7FF", border: "#6366F1", text: "#3730A3" },
    connector: "#475569",
  },
  {
    value: "clean-dark",
    label: "Clean Dark",
    dark: true,
    canvas: "#1E293B",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: 8,
    border: 1,
    terminal: { bg: "#065F46", border: "#10B981", text: "#ECFDF5" },
    process: { bg: "#334155", border: "#475569", text: "#E2E8F0" },
    decision: { bg: "#172554", border: "#3B82F6", text: "#BFDBFE" },
    action: { bg: "#312E81", border: "#6366F1", text: "#C7D2FE" },
    connector: "#64748B",
  },
  {
    value: "monochrome",
    label: "Monochrome Professional",
    canvas: "#FFFFFF",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: 6,
    border: 1.5,
    terminal: { bg: "#1F2937", border: "#111827", text: "#FFFFFF" },
    process: { bg: "#F9FAFB", border: "#4B5563", text: "#111827" },
    decision: { bg: "#FFFFFF", border: "#374151", text: "#111827" },
    action: { bg: "#FFFFFF", border: "#6B7280", text: "#374151" },
    connector: "#374151",
  },
  {
    value: "modern-card",
    label: "Modern Card",
    canvas: "#FAFAF9",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: 12,
    border: 1,
    terminal: { bg: "#1C1917", border: "#292524", text: "#FAFAFA" },
    process: { bg: "#FFFFFF", border: "#E7E5E4", text: "#292524" },
    decision: { bg: "#FFFFFF", border: "#F59E0B", text: "#92400E" },
    action: { bg: "#FFFFFF", border: "#8B5CF6", text: "#6D28D9" },
    connector: "#A8A29E",
  },
  {
    value: "linear",
    label: "Linear / Product",
    canvas: "#F8FAFC",
    fontFamily: "Inter, 'Geist Sans', ui-sans-serif, system-ui, sans-serif",
    radius: 8,
    border: 1.5,
    terminal: { bg: "#18181B", border: "#18181B", text: "#FFFFFF" },
    process: { bg: "#FFFFFF", border: "#D4D4D8", text: "#27272A" },
    decision: { bg: "#EEF2FF", border: "#6366F1", text: "#4338CA" },
    action: { bg: "#ECFDF5", border: "#10B981", text: "#047857" },
    connector: "#A1A1AA",
  },
  {
    value: "glass",
    label: "Glass / Aurora",
    canvas: "#F8FAFC",
    fontFamily: "'Plus Jakarta Sans', Inter, ui-sans-serif, sans-serif",
    radius: 14,
    border: 1.5,
    terminal: { bg: "#312E81", border: "#312E81", text: "#FFFFFF" },
    process: { bg: "#F5F3FF", border: "#8B5CF6", text: "#5B21B6" },
    decision: { bg: "#ECFEFF", border: "#06B6D4", text: "#0E7490" },
    action: { bg: "#ECFDF5", border: "#10B981", text: "#047857" },
    connector: "#94A3B8",
  },
  {
    value: "ibm",
    label: "IBM / Enterprise",
    canvas: "#F4F4F4",
    fontFamily: "'IBM Plex Sans', Inter, ui-sans-serif, sans-serif",
    radius: 3,
    border: 1,
    terminal: { bg: "#161616", border: "#161616", text: "#FFFFFF" },
    process: { bg: "#E8F1FF", border: "#0F62FE", text: "#0043CE" },
    decision: { bg: "#F6F2FF", border: "#8A3FFC", text: "#6929C4" },
    action: { bg: "#DEFBE6", border: "#24A148", text: "#0E6027" },
    connector: "#525252",
  },
  {
    value: "midnight",
    label: "Midnight Indigo",
    dark: true,
    canvas: "#09090B",
    fontFamily: "'Geist Sans', Inter, ui-sans-serif, sans-serif",
    radius: 8,
    border: 1,
    terminal: { bg: "#27272A", border: "#3F3F46", text: "#FAFAFA" },
    process: { bg: "#18181B", border: "#3F3F46", text: "#E4E4E7" },
    decision: { bg: "#1E1B4B", border: "#6366F1", text: "#C7D2FE" },
    action: { bg: "#052E2B", border: "#14B8A6", text: "#99F6E4" },
    connector: "#71717A",
  },
  {
    value: "ocean",
    label: "Ocean / Cloud",
    canvas: "#F8FAFC",
    fontFamily: "Inter, Manrope, ui-sans-serif, sans-serif",
    radius: 10,
    border: 1.5,
    terminal: { bg: "#0C4A6E", border: "#0C4A6E", text: "#FFFFFF" },
    process: { bg: "#F0F9FF", border: "#0EA5E9", text: "#0369A1" },
    decision: { bg: "#ECFEFF", border: "#06B6D4", text: "#0E7490" },
    action: { bg: "#F0FDFA", border: "#14B8A6", text: "#0F766E" },
    connector: "#64748B",
  },
  {
    value: "swiss",
    label: "Swiss / High Contrast",
    canvas: "#FAFAFA",
    fontFamily: "'Helvetica Neue', Inter, Arial, sans-serif",
    radius: 4,
    border: 1.5,
    terminal: { bg: "#111111", border: "#111111", text: "#FFFFFF" },
    process: { bg: "#FFFFFF", border: "#A3A3A3", text: "#171717" },
    decision: { bg: "#FFFFFF", border: "#2563EB", text: "#1D4ED8" },
    action: { bg: "#FFFFFF", border: "#16A34A", text: "#166534" },
    connector: "#525252",
  },
  {
    value: "lavender",
    label: "Soft Lavender",
    canvas: "#FAFAFF",
    fontFamily: "Manrope, 'Plus Jakarta Sans', ui-sans-serif, sans-serif",
    radius: 12,
    border: 1.5,
    terminal: { bg: "#4C1D95", border: "#4C1D95", text: "#FFFFFF" },
    process: { bg: "#F5F3FF", border: "#8B5CF6", text: "#5B21B6" },
    decision: { bg: "#FFF7ED", border: "#F97316", text: "#9A3412" },
    action: { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8" },
    connector: "#78716C",
  },
] as const satisfies readonly DiagramThemeSpec[];

export type DiagramTheme = (typeof diagramThemes)[number]["value"];

export const defaultDiagramTheme: DiagramTheme = "modern-minimal";

export function getThemeSpec(value: string): DiagramThemeSpec {
  return diagramThemes.find((t) => t.value === value) ?? diagramThemes[0];
}

export function isDiagramTheme(value: string): value is DiagramTheme {
  return diagramThemes.some((t) => t.value === value);
}

function buildThemeCSS(spec: DiagramThemeSpec): string {
  return `
  /* Process cards (default) */
  .node rect, .node path { rx: ${spec.radius}px; ry: ${spec.radius}px; stroke-width: ${spec.border}px; }
  .node circle, .node ellipse { stroke-width: ${spec.border}px; }

  /* Decision diamonds — auto-detected */
  .node polygon { fill: ${spec.decision.bg} !important; stroke: ${spec.decision.border} !important; stroke-width: ${spec.border}px; }
  .node:has(polygon) .nodeLabel { color: ${spec.decision.text} !important; }

  /* Terminal pills — tag nodes with :::flow-start */
  .node.flow-start rect, .node.flow-start path { fill: ${spec.terminal.bg} !important; stroke: ${spec.terminal.border} !important; rx: 20px; ry: 20px; }
  .node.flow-start .nodeLabel { color: ${spec.terminal.text} !important; font-weight: 700; }

  /* Action / debug cards — tag nodes with :::flow-action */
  .node.flow-action rect, .node.flow-action path { fill: ${spec.action.bg} !important; stroke: ${spec.action.border} !important; }
  .node.flow-action .nodeLabel { color: ${spec.action.text} !important; }

  /* Connectors */
  .edgePath .path, .flowchart-link { stroke: ${spec.connector} !important; stroke-width: 2px; }
  .marker { fill: ${spec.connector} !important; stroke: ${spec.connector} !important; }
  .edgeLabel { border-radius: 6px; }

  .cluster rect { rx: ${spec.radius + 4}px; ry: ${spec.radius + 4}px; stroke-dasharray: 4 4; }
  .label { font-weight: 500; }
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
