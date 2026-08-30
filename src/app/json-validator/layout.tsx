import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/json-validator");

export default function JsonValidatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
