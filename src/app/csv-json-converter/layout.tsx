import { buildToolMetadata } from "@/lib/seo";

export const metadata = buildToolMetadata("/csv-json-converter");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
