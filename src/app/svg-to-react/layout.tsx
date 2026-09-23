import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/seo";

export const metadata: Metadata = buildToolMetadata("/svg-to-react");

export default function SvgToReactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
