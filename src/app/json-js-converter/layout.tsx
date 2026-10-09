import { buildToolMetadata } from "@/lib/seo";

export const metadata = buildToolMetadata("/json-js-converter");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
