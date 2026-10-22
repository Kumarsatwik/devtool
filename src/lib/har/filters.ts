import type { RequestCategory } from "./types.ts";

export type ExplorerFilter =
  | "all"
  | "error"
  | "slow"
  | "large"
  | "cors"
  | "thirdparty"
  | "sensitive"
  | RequestCategory;

/**
 * Explicit handoff from another view (Overview, Domains) into the explorer.
 * The explorer renders a visible, dismissible chip for this state, so the
 * user always knows why the list is filtered.
 */
export type ExplorerHandoff =
  | { kind: "none" }
  | { kind: "filter"; filter: ExplorerFilter; label: string }
  | { kind: "domain"; host: string };

export type TimelineFilter = "all" | "api" | "page" | "image" | "js" | "css" | "thirdparty";

export const FILTER_TABS: { key: ExplorerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "error", label: "Errors" },
  { key: "slow", label: "Slow" },
  { key: "large", label: "Large" },
  { key: "cors", label: "CORS" },
  { key: "sensitive", label: "Sensitive" },
  { key: "api", label: "API" },
  { key: "auth", label: "Authentication" },
  { key: "thirdparty", label: "Third-party" },
  { key: "image", label: "Images" },
  { key: "js", label: "JavaScript" },
  { key: "css", label: "CSS" },
];

export const FILTER_LABELS: Record<ExplorerFilter, string> = {
  all: "All requests",
  error: "Errors",
  slow: "Slow requests",
  large: "Large responses",
  cors: "CORS issues",
  thirdparty: "Third-party requests",
  sensitive: "Sensitive data",
  page: "Documents",
  api: "API requests",
  auth: "Authentication",
  image: "Images",
  js: "JavaScript",
  css: "CSS",
  font: "Fonts",
  data: "Data",
  analytics: "Analytics",
  other: "Other",
};

export const TIMELINE_FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "api", label: "API" },
  { key: "page", label: "Documents" },
  { key: "image", label: "Images" },
  { key: "js", label: "JavaScript" },
  { key: "css", label: "CSS" },
  { key: "thirdparty", label: "Third-party" },
];
