import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/xml-to-json");

export default function XmlToJsonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
