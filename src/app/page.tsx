"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Card,
  CardDescription,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  ArrowLeftRight,
  Braces,
  CheckCircle,
  FileCode2,
  FileSpreadsheet,
  Sparkles,
  Search,
  Lock,
  Zap,
  Terminal,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Workflow,
  FileText,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const tools = [
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
    title: "Mermaid Diagram",
    description: "Write Mermaid syntax, preview diagrams, and export as images",
    icon: Workflow,
    tag: "Diagrams",
  },
  {
    href: "/markdown-preview",
    title: "Markdown Preview",
    description: "Live Markdown editing with HTML preview and export to PDF/HTML",
    icon: FileText,
    tag: "Docs",
  },
];

const faqData = [
  {
    question: "Is my data secure when using DataTools?",
    answer:
      "Yes, 100%. DataTools runs all computations locally in your browser. No files, logs, or payload strings are ever uploaded or transmitted to any server. You can even run the application fully offline.",
  },
  {
    question: "What file size limitations exist?",
    answer:
      "Since processing happens locally, file limitations depend on your browser's allocated memory. Generally, JSON and CSV datasets up to 10-15MB compile instantly, while larger files may experience a brief rendering delay.",
  },
  {
    question: "What is the difference between DevTools and DataTools?",
    answer:
      "DataTools is our rebranded utility suite designed strictly for database and format operations (JSON/CSV mappings). It introduces permanent side-panel navigations, clean neutral grids, and a production-ready SaaS interface.",
  },
  {
    question: "How does the JSON Compare diff viewer work?",
    answer:
      "We utilize Monaco Editor's native diffing algorithm—the same engine that drives VS Code—to provide real-time, high-fidelity side-by-side or inline comparison views.",
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const filteredTools = useMemo(() => {
    return tools.filter(
      (tool) =>
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.tag.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="neutral-grid-bg min-h-screen flex flex-col justify-between">
      {/* Homepage Main Content */}
      <div className="max-w-5xl mx-auto py-20 px-4 sm:px-6 lg:px-8 space-y-24 flex-1 w-full">
        {/* Minimal Hero Section */}
        <div className="text-center space-y-6 max-w-2xl mx-auto select-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-border bg-card text-muted-foreground text-[10px] font-bold">
            <Lock className="h-3 w-3" />
            <span>Local Browser Sandboxing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-none">
            Clean, Focused Developer Utilities
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
            A fast, enterprise-grade suite for JSON formatting, syntax
            validation, file comparisons, and CSV transformations. Runs fully
            client-side.
          </p>

          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/csv-to-json"
              className={buttonVariants({
                size: "sm",
                className: "font-semibold rounded",
              })}
            >
              Launch Utilities
            </Link>
            <a
              href="#tools"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "font-semibold rounded",
              })}
            >
              Browse Catalog
            </a>
          </div>
        </div>

        {/* Tools Grid Section */}
        <div id="tools" className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Available Utilities
              </h2>
              <p className="text-xs text-muted-foreground">
                Select a tool to open the workspace
              </p>
            </div>

            {/* Simple Search Box */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {filteredTools.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="block group"
                  >
                    <Card className="h-full border border-border bg-card hover:bg-secondary/40 transition-all duration-150 rounded shadow-none">
                      <CardContent className="p-5 space-y-4 flex flex-col justify-between h-full">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-foreground">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-[9px] font-semibold text-muted-foreground uppercase border border-border px-1.5 py-0.2 rounded">
                              {tool.tag}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <CardTitle className="text-sm font-bold text-foreground">
                              {tool.title}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground leading-normal">
                              {tool.description}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors gap-1">
                          <span>Open Workspace</span>
                          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed rounded bg-card/20 border-border">
              <Braces className="h-8 w-8 text-muted-foreground/45 mx-auto mb-2" />
              <p className="text-xs font-medium text-muted-foreground">
                No custom developer utility matches your query.
              </p>
            </div>
          )}
        </div>

        {/* Features Row */}
        <div className="border-t border-border pt-12 space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Engineered for Reliability
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 text-xs leading-normal">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>Zero Server Dependencies</span>
              </div>
              <p className="text-muted-foreground">
                All validations, format corrections, comparisons, and CSV
                transformations run within browser JavaScript. Secure for
                processing database logs or internal properties.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span>Monaco Editor Core</span>
              </div>
              <p className="text-muted-foreground">
                Powered by the Monaco core component framework. Experience
                bracket pairing, line references, code folding, block selects,
                and responsive layouts.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>Instant Compilation</span>
              </div>
              <p className="text-muted-foreground">
                Fast client-side rendering engines handle file loads up to
                dozens of megabytes with sub-millisecond compile loops.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="border-t border-border pt-12 space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="border border-border rounded divide-y divide-border bg-card">
            {faqData.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div key={index} className="transition-all duration-200">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-foreground hover:bg-secondary/40 select-none"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-muted-foreground leading-normal border-t border-border bg-muted/5 animate-in fade-in duration-150">
                      <p className="pt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shared Platform Footer */}
      <footer className="w-full border-t border-border bg-card py-8 select-none text-[11px] text-muted-foreground mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-2 max-w-xs">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Braces className="h-4 w-4" />
              <span>DataTools</span>
            </div>
            <p className="leading-relaxed">
              Browser-based, sandboxed developer tools for formatting,
              validation, and layout compilation. All processing remains
              strictly offline.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <span className="font-bold text-foreground block">Utilities</span>
              <ul className="space-y-1.5">
                <li>
                  <Link href="/csv-to-json" className="hover:text-foreground">
                    CSV → JSON
                  </Link>
                </li>
                <li>
                  <Link href="/json-to-csv" className="hover:text-foreground">
                    JSON → CSV
                  </Link>
                </li>
                <li>
                  <Link
                    href="/json-compare"
                    className="hover:text-foreground"
                  >
                    Compare JSON
                  </Link>
                </li>
                <li>
                  <Link
                    href="/epoch-converter"
                    className="hover:text-foreground"
                  >
                    Epoch Converter
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <span className="font-bold text-foreground block">Design</span>
              <ul className="space-y-1.5">
                <li>
                  <Link
                    href="/json-beautifier"
                    className="hover:text-foreground"
                  >
                    Beautifier
                  </Link>
                </li>
                <li>
                  <Link
                    href="/json-validator"
                    className="hover:text-foreground"
                  >
                    Linter
                  </Link>
                </li>
                <li>
                  <Link href="/json-to-js" className="hover:text-foreground">
                    JSON → JS
                  </Link>
                </li>
                <li>
                  <Link href="/js-to-json" className="hover:text-foreground">
                    JS → JSON
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border mt-8 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            &copy; {new Date().getFullYear()} DataTools. Open Source local-only
            sandbox.
          </span>
          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <Lock className="h-3 w-3" />
            Offline Verified
          </span>
        </div>
      </footer>
    </div>
  );
}
