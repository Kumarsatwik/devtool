import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/json-to-csv");

export default function JsonToCsvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
