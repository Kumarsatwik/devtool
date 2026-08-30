import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/epoch-converter");

export default function EpochConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
