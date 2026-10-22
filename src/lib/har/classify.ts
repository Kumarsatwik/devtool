import type { HarEntry, RequestCategory } from "./types.ts";

export const CATEGORY_META: Record<RequestCategory, { label: string }> = {
  page: { label: "Page" },
  api: { label: "API request" },
  auth: { label: "Authentication" },
  image: { label: "Image" },
  js: { label: "JavaScript" },
  css: { label: "CSS" },
  font: { label: "Font" },
  data: { label: "Data" },
  analytics: { label: "Analytics" },
  other: { label: "Other" },
};

const ANALYTICS_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "segment.com",
  "segment.io",
  "mixpanel.com",
  "amplitude.com",
  "sentry.io",
  "hotjar.com",
  "fullstory.com",
  "intercom.io",
  "facebook.net",
  "plausible.io",
  "clarity.ms",
  "newrelic.com",
  "datadoghq.com",
];

const AUTH_PATH =
  /\/(login|log-in|signin|sign-in|sign-in|logout|auth|oauth|token|session|sso|saml|register|signup|sign-up)/i;

function extOf(path: string): string {
  const m = /\.([a-z0-9]{1,5})(?:[?#]|$)/i.exec(path);
  return m ? m[1].toLowerCase() : "";
}

/** Matches IPv4 addresses (e.g. 192.168.1.1) and bracketed IPv6 literals (e.g. [::1]). */
const IP_HOST_RE = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[[0-9a-fA-F:]+\]$/;

/** Registrable-domain heuristic: last two hostname labels (full host for IP addresses). */
export function baseDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  if (IP_HOST_RE.test(host)) return host;
  return parts.slice(-2).join(".");
}

export function categorize(
  entry: HarEntry,
  url: URL | null,
  mime: string,
): RequestCategory {
  const host = url?.hostname ?? "";
  const path = (url?.pathname ?? "").toLowerCase();
  const ext = extOf(path);
  const m = mime.toLowerCase();

  if (ANALYTICS_HOSTS.some((h) => host === h || host.endsWith("." + h)))
    return "analytics";
  if (m.includes("html")) return "page";
  if (AUTH_PATH.test(path)) return "auth";
  if (
    m.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "avif"].includes(ext)
  )
    return "image";
  if (m.includes("javascript") || ext === "js" || ext === "mjs") return "js";
  if (m.includes("text/css") || ext === "css") return "css";
  if (
    m.includes("font") ||
    ["woff", "woff2", "ttf", "otf", "eot"].includes(ext)
  )
    return "font";
  if (
    m.includes("json") ||
    path.startsWith("/api/") ||
    path.includes("/api/") ||
    path.startsWith("/graphql") ||
    ext === "json"
  )
    return "api";
  if (
    m.includes("xml") ||
    m.includes("csv") ||
    ["xml", "csv", "ndjson"].includes(ext)
  )
    return "data";
  return "other";
}
