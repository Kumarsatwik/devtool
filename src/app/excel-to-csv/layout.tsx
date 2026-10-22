import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/excel-to-csv");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
