import type { ToolIconName } from "./tool-icons.ts";

export interface ToolDefinition {
  href: string;
  title: string;
  description: string;
  icon: ToolIconName;
  tag: string;
}

export interface NavGroup {
  id: string;
  label: string;
  description: string;
  icon: ToolIconName;
  tools: ToolDefinition[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "convert",
    label: "File Converters",
    description: "Translate one file format into another",
    icon: "repeat",
    tools: [
      {
        href: "/csv-json-converter",
        title: "CSV ↔ JSON",
        description: "Convert CSV and JSON in either direction with type casting and a table preview",
        icon: "fileSpreadsheet",
        tag: "CSV to JSON / JSON to CSV",
      },
      {
        href: "/excel-to-csv",
        title: "Excel → CSV",
        description:
          "Convert Excel spreadsheets (.xlsx / .xls) into clean CSV sheets",
        icon: "fileSpreadsheet",
        tag: "Excel to CSV",
      },
      {
        href: "/xml-to-json",
        title: "XML → JSON",
        description:
          "Convert XML documents into structured JSON with attributes, arrays, and nested elements",
        icon: "codeXml",
        tag: "XML to JSON",
      },
      {
        href: "/json-js-converter",
        title: "JSON ↔ JS",
        description:
          "Convert JSON and JavaScript object literals in either direction without executing code",
        icon: "fileCode",
        tag: "JSON to JS / JS to JSON",
      },
      {
        href: "/svg-to-react",
        title: "SVG → React",
        description:
          "Convert SVG markup into React components with live preview, TypeScript support, and configurable props",
        icon: "penTool",
        tag: "SVG",
      },
    ],
  },
  {
    id: "json",
    label: "JSON Utilities",
    description: "Format, validate, compare, and clean JSON",
    icon: "braces",
    tools: [
      {
        href: "/json-beautifier",
        title: "JSON Beautifier",
        description: "Format, indent, or collapse raw JSON data to read it easily",
        icon: "sparkles",
        tag: "Format & Minify",
      },
      {
        href: "/json-validator",
        title: "JSON Validator",
        description: "Validate JSON syntax and debug malformed keys or brackets",
        icon: "checkCircle",
        tag: "Validator",
      },
      {
        href: "/json-compare",
        title: "JSON Compare",
        description: "Compare two JSON objects side-by-side and find discrepancies",
        icon: "arrowLeftRight",
        tag: "Diff Viewer",
      },
      {
        href: "/json-sanitizer",
        title: "JSON Sanitizer",
        description:
          "Redact sensitive values from API responses and database records before sharing",
        icon: "shieldCheck",
        tag: "Privacy",
      },
    ],
  },
  {
    id: "preview",
    label: "Preview & Notes",
    description: "Write markup and preview the rendered result",
    icon: "squarePlay",
    tools: [
      {
        href: "/html-playground",
        title: "HTML Playground",
        description:
          "Write HTML, CSS, and JavaScript with a live sandboxed preview, console output, and standalone HTML export",
        icon: "code",
        tag: "Playground",
      },
      {
        href: "/mermaid-diagram",
        title: "Mermaid Diagram",
        description:
          "Write Mermaid syntax, preview diagrams, and export as images",
        icon: "workflow",
        tag: "Diagrams",
      },
      {
        href: "/markdown-preview",
        title: "Markdown Notes",
        description:
          "Rich Markdown note editor with diagrams, images, and export to PDF/HTML/DOCX/TXT/MD",
        icon: "fileText",
        tag: "Docs",
      },
    ],
  },
  {
    id: "inspect",
    label: "Inspect & Debug",
    description: "Analyze network captures and timestamps",
    icon: "microscope",
    tools: [
      {
        href: "/har-analyzer",
        title: "HAR Analyzer",
        description:
          "Analyze HTTP Archive files for performance, errors, CORS, and auth issues",
        icon: "network",
        tag: "Performance",
      },
      {
        href: "/epoch-converter",
        title: "Epoch Converter",
        description:
          "Convert epoch timestamps to IST and UTC, and dates back to epoch",
        icon: "clock",
        tag: "Time",
      },
    ],
  },
];

// `tools` stays flat for the catalog, search, and sitemap.
export const TOOLS: ToolDefinition[] = NAV_GROUPS.flatMap((group) => group.tools);
