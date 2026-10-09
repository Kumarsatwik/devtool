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
  Network,
  ShieldCheck,
  PenTool,
  Braces,
  Repeat,
  Code2,
  SquarePlay,
  Microscope,
  type LucideIcon,
} from "lucide-react";

export interface ToolDefinition {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tag: string;
}

export interface NavGroup {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tools: ToolDefinition[];
}

export const navGroups: NavGroup[] = [
  {
    id: "convert",
    label: "File Converters",
    description: "Translate one file format into another",
    icon: Repeat,
    tools: [
      {
        href: "/csv-json-converter",
        title: "CSV ↔ JSON",
        description: "Convert CSV and JSON in either direction with type casting and a table preview",
        icon: FileSpreadsheet,
        tag: "CSV to JSON / JSON to CSV",
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
        href: "/json-js-converter",
        title: "JSON ↔ JS",
        description:
          "Convert JSON and JavaScript object literals in either direction without executing code",
        icon: FileCode2,
        tag: "JSON to JS / JS to JSON",
      },
      {
        href: "/svg-to-react",
        title: "SVG → React",
        description:
          "Convert SVG markup into React components with live preview, TypeScript support, and configurable props",
        icon: PenTool,
        tag: "SVG",
      },
    ],
  },
  {
    id: "json",
    label: "JSON Utilities",
    description: "Format, validate, compare, and clean JSON",
    icon: Braces,
    tools: [
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
        href: "/json-sanitizer",
        title: "JSON Sanitizer",
        description:
          "Redact sensitive values from API responses and database records before sharing",
        icon: ShieldCheck,
        tag: "Privacy",
      },
    ],
  },
  {
    id: "preview",
    label: "Preview & Notes",
    description: "Write markup and preview the rendered result",
    icon: SquarePlay,
    tools: [
      {
        href: "/html-playground",
        title: "HTML Playground",
        description:
          "Write HTML, CSS, and JavaScript with a live sandboxed preview, console output, and standalone HTML export",
        icon: Code2,
        tag: "Playground",
      },
      {
        href: "/mermaid-diagram",
        title: "Mermaid Diagram",
        description:
          "Write Mermaid syntax, preview diagrams, and export as images",
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
    ],
  },
  {
    id: "inspect",
    label: "Inspect & Debug",
    description: "Analyze network captures and timestamps",
    icon: Microscope,
    tools: [
      {
        href: "/har-analyzer",
        title: "HAR Analyzer",
        description:
          "Analyze HTTP Archive files for performance, errors, CORS, and auth issues",
        icon: Network,
        tag: "Performance",
      },
      {
        href: "/epoch-converter",
        title: "Epoch Converter",
        description:
          "Convert epoch timestamps to IST and UTC, and dates back to epoch",
        icon: Clock,
        tag: "Time",
      },
    ],
  },
];

// `tools` stays flat for the catalog, search, and sitemap.
export const tools: ToolDefinition[] = navGroups.flatMap((group) => group.tools);
