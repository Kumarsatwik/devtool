import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/markdown-preview");

export default function MarkdownPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
