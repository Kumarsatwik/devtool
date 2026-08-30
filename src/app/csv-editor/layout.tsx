import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/csv-editor");

export default function CsvEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
