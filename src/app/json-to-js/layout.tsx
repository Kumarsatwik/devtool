import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/json-to-js");

export default function JsonToJsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
