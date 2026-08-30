import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/mermaid-diagram");

export default function MermaidDiagramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
