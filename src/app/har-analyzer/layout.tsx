import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/har-analyzer");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
