import type { Metadata } from "next";

interface ToolSeo {
  title: string;
  description: string;
  keywords: string;
}

const TOOL_SEO: Record<string, ToolSeo> = {
  "/csv-editor": {
    title: "CSV Editor Online – Edit, Sort & Style CSV Data | DataTools",
    description:
      "Edit CSV files in a spreadsheet-style grid: sort columns, filter rows, find & replace, restyle, and export to CSV or Excel. All in your browser, no uploads.",
    keywords:
      "csv editor, online csv editor, csv grid editor, edit csv online, csv sort, csv filter, csv to excel, csv styler",
  },
  "/csv-to-json": {
    title: "CSV to JSON Converter – Free Online Tool | DataTools",
    description:
      "Convert CSV or TSV data to a structured JSON array instantly. Auto-detect delimiters, smart type casting, and live conversion — 100% client-side.",
    keywords:
      "csv to json, csv to json converter, tsv to json, csv parser, convert csv to json online",
  },
  "/json-to-csv": {
    title: "JSON to CSV Converter – Free Online Tool | DataTools",
    description:
      "Convert JSON arrays of objects into clean, spreadsheet-ready CSV with a live table grid preview. Runs entirely in your browser.",
    keywords:
      "json to csv, json to csv converter, json to excel, convert json to csv online, json array to csv",
  },
  "/excel-to-csv": {
    title: "Excel to CSV Converter – XLSX to CSV Online | DataTools",
    description:
      "Convert Excel spreadsheets (.xlsx / .xls) into clean CSV sheets for each worksheet. Fast, free, and fully client-side.",
    keywords:
      "excel to csv, xlsx to csv, xls to csv, excel converter, convert excel to csv online",
  },
  "/json-to-js": {
    title: "JSON to JS Converter – JSON to JavaScript Object | DataTools",
    description:
      "Convert standard JSON text into unquoted JavaScript object literals, ready to paste into your code. Free, instant, and offline.",
    keywords:
      "json to js, json to javascript, json to js object, json to javascript converter, json to object literal",
  },
  "/js-to-json": {
    title: "JS to JSON Converter – JavaScript Object to JSON | DataTools",
    description:
      "Turn JavaScript object literals back into strict, valid JSON. Live compilation with indentation options, fully client-side.",
    keywords:
      "js to json, javascript to json, js object to json, convert js to json online",
  },
  "/json-beautifier": {
    title: "JSON Beautifier & Formatter – Pretty Print JSON | DataTools",
    description:
      "Beautify, format, indent, or minify raw JSON in one click. Choose 2-space, 4-space, or tab indentation. Free online JSON formatter.",
    keywords:
      "json beautifier, json formatter, pretty print json, json pretty printer, json minifier, json format online",
  },
  "/json-validator": {
    title: "JSON Validator – Validate & Debug JSON Online | DataTools",
    description:
      "Validate JSON syntax with line and column error coordinates, context snippets, and document metrics. Free online JSON linter.",
    keywords:
      "json validator, validate json, json syntax checker, json linter, json error finder",
  },
  "/json-compare": {
    title: "JSON Compare & Diff Tool – Side by Side | DataTools",
    description:
      "Compare two JSON documents side-by-side with a GitHub-style diff view and a detailed change summary with paths. Free online JSON diff.",
    keywords:
      "json compare, json diff, json compare tool, json diff online, compare two json files",
  },
  "/epoch-converter": {
    title: "Epoch Converter – Unix Timestamp to Date (IST & UTC) | DataTools",
    description:
      "Convert Unix epoch timestamps to UTC, IST, and local time — and dates back to epoch seconds or milliseconds. Free online time converter.",
    keywords:
      "epoch converter, unix timestamp converter, epoch to date, timestamp to ist, date to epoch, epoch ms",
  },
  "/mermaid-diagram": {
    title: "Mermaid Diagram Editor – Flowcharts & Diagrams Online | DataTools",
    description:
      "Write Mermaid syntax and preview flowcharts, sequence diagrams, and more with live rendering. Export to SVG, PNG, or JPG.",
    keywords:
      "mermaid editor, mermaid diagram, mermaid flowchart, mermaid online, mermaid to png, mermaid to svg",
  },
  "/markdown-preview": {
    title: "Markdown Notes Editor – Rich Text & Mermaid | DataTools",
    description:
      "A rich Markdown note editor with live preview, embedded Mermaid diagrams, images, and export to PDF, HTML, DOCX, TXT, and MD.",
    keywords:
      "markdown editor, markdown notes, rich text editor, markdown to pdf, markdown to docx, markdown preview",
  },
  "/html-playground": {
    title: "HTML Playground – Live HTML, CSS & JS Compiler | DataTools",
    description:
      "Write HTML, CSS, and JavaScript with an instant live preview in a sandboxed iframe, captured console output, and one-click standalone HTML export. 100% client-side.",
    keywords:
      "html playground, html editor online, javascript playground, html css js live preview, html compiler online, run javascript online, html sandbox",
  },
  "/har-analyzer": {
    title: "HAR Analyzer – HTTP Archive Performance & Error Tool | DataTools",
    description:
      "Analyze HAR files for performance bottlenecks, failed requests, CORS and auth issues, third-party domains, and leaked sensitive data.",
    keywords:
      "har analyzer, har file viewer, har performance, analyze har online, http archive analyzer",
  },
  "/json-sanitizer": {
    title: "JSON Sanitizer – Redact Sensitive Data Online | DataTools",
    description:
      "Redact passwords, tokens, API keys, and other sensitive fields from JSON before sharing. Fully client-side with configurable rules.",
    keywords:
      "json sanitizer, redact json, remove sensitive data json, json data masking, api response sanitizer",
  },
};

const SITE_NAME = "DataTools";
const SITE_URL = "https://datatools.app";
const SITE_DESCRIPTION =
  "Free online developer tools for JSON and CSV conversion, validation, formatting, and comparison. All processing happens locally in your browser.";

export function buildToolMetadata(path: string): Metadata {
  const seo = TOOL_SEO[path];
  if (!seo) {
    return {
      title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
      description: SITE_DESCRIPTION,
    };
  }

  const canonical = `${SITE_URL}${path === "/" ? "" : path}`;

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: seo.title,
      description: seo.description,
    },
  };
}

export { SITE_NAME, SITE_URL, SITE_DESCRIPTION };
