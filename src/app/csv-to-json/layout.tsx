import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/csv-to-json");

export default function CsvToJsonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
