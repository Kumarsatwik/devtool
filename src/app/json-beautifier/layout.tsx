import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/json-beautifier");

export default function JsonBeautifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
