import {
  ArrowLeftRight,
  CheckCircle,
  CodeXml,
  FileCode2,
  FileSpreadsheet,
  Sparkles,
  Clock,
  Workflow,
  FileText,
  MonitorPlay,
  Network,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface ToolDefinition {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tag: string;
}

/**
 * Single source of truth for every tool. Both the homepage catalog
 * (src/app/page.tsx) and the sidebar navigation
 * (src/components/sidebar-layout.tsx) render from this list, so a new
 * tool only needs to be added here.
 */
export const tools: ToolDefinition[] = [
  {
    href: "/csv-to-json",
    title: "CSV → JSON",
    description: "Convert tabular CSV data to a structured JSON array",
    icon: FileSpreadsheet,
    tag: "CSV to JSON",
  },
  {
    href: "/json-to-csv",
    title: "JSON → CSV",
    description: "Convert JSON arrays into clean comma-separated CSV format",
    icon: FileSpreadsheet,
    tag: "JSON to CSV",
  },
  {
    href: "/excel-to-csv",
    title: "Excel → CSV",
    description:
      "Convert Excel spreadsheets (.xlsx / .xls) into clean CSV sheets",
    icon: FileSpreadsheet,
    tag: "Excel to CSV",
  },
  {
    href: "/xml-to-json",
    title: "XML → JSON",
    description:
      "Convert XML documents into structured JSON with attributes, arrays, and nested elements",
    icon: CodeXml,
    tag: "XML to JSON",
  },
  {
    href: "/json-to-js",
    title: "JSON → JS",
    description:
      "Convert standard JSON text to JavaScript object literal notation",
    icon: FileCode2,
    tag: "JSON to JS",
  },
  {
    href: "/js-to-json",
    title: "JS → JSON",
    description:
      "Convert JavaScript object literals back into strict, valid JSON",
    icon: FileCode2,
    tag: "JS to JSON",
  },
  {
    href: "/json-beautifier",
    title: "JSON Beautifier",
    description: "Format, indent, or collapse raw JSON data to read it easily",
    icon: Sparkles,
    tag: "Format & Minify",
  },
  {
    href: "/json-validator",
    title: "JSON Validator",
    description: "Validate JSON syntax and debug malformed keys or brackets",
    icon: CheckCircle,
    tag: "Validator",
  },
  {
    href: "/json-compare",
    title: "JSON Compare",
    description: "Compare two JSON objects side-by-side and find discrepancies",
    icon: ArrowLeftRight,
    tag: "Diff Viewer",
  },
  {
    href: "/epoch-converter",
    title: "Epoch Converter",
    description:
      "Convert epoch timestamps to IST and UTC, and dates back to epoch",
    icon: Clock,
    tag: "Time",
  },
  {
    href: "/mermaid-diagram",
    title: "Mermaid & PlantUML",
    description:
      "Write Mermaid or PlantUML syntax, preview diagrams, and export as images",
    icon: Workflow,
    tag: "Diagrams",
  },
  {
    href: "/markdown-preview",
    title: "Markdown Notes",
    description:
      "Rich Markdown note editor with diagrams, images, and export to PDF/HTML/DOCX/TXT/MD",
    icon: FileText,
    tag: "Docs",
  },
  {
    href: "/har-analyzer",
    title: "HAR Analyzer",
    description:
      "Analyze HTTP Archive files for performance, errors, CORS, and auth issues",
    icon: Network,
    tag: "Performance",
  },
  {
    href: "/json-sanitizer",
    title: "JSON Sanitizer",
    description:
      "Redact sensitive values from API responses and database records before sharing",
    icon: ShieldCheck,
    tag: "Privacy",
  },
  {
    href: "/html-playground",
    title: "HTML Playground",
    description:
      "Write HTML, CSS, and JavaScript with a live sandboxed preview, console output, and standalone HTML export",
    icon: MonitorPlay,
    tag: "Playground",
  },
];
