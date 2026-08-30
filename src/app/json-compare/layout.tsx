import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/json-compare");

export default function JsonCompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
