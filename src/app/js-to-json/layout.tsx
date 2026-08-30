import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/js-to-json");

export default function JsToJsonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
