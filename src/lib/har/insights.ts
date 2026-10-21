import { CATEGORY_META } from "./classify.ts";
import type { AnalyzedEntry, HarEntry } from "./types.ts";

const STATUS_EXPLANATIONS: Record<number, string> = {
  200: "The request succeeded and the server returned the requested content.",
  201: "The request succeeded and the server created a new resource.",
  204: "The request succeeded; the server has no content to send back.",
  301: "The resource has permanently moved to a new address.",
  302: "The resource was found at a different (temporary) address.",
  304: "The cached copy is still valid, so no data was downloaded again.",
  400: "The server could not understand the request — it may be malformed.",
  401: "The server did not accept the authentication information for this request.",
  403: "The server understood the request but refuses to authorize it.",
  404: "The server could not find the requested resource.",
  408: "The server timed out waiting for the request.",
  409: "The request conflicts with the current state of the server.",
  422: "The request was well-formed but contained invalid data.",
  429: "Too many requests — the server is rate-limiting this client.",
  500: "The server encountered an error while processing the request.",
  502: "A gateway or proxy received an invalid response from the upstream server.",
  503: "The server is temporarily unavailable — it may be overloaded or down for maintenance.",
  504: "A gateway or proxy timed out waiting for the upstream server.",
};

/** Plain-English explanation of what happened, when reliably derivable. */
export function explainEntry(entry: AnalyzedEntry): string | null {
  const { status, statusText, category } = entry;
  const catLabel = CATEGORY_META[category].label.toLowerCase();
  if (status === 0) {
    return "This request never completed. It may have been blocked (for example by a CORS policy or an ad blocker), aborted, or failed before the server responded.";
  }
  const base = STATUS_EXPLANATIONS[status];
  if (base) {
    if (status >= 400) {
      return `The browser sent a ${catLabel} request, but the server rejected it with ${status} ${statusText || ""}. ${base}`.trim();
    }
    return base;
  }
  if (status >= 200 && status < 300)
    return "The request completed successfully.";
  if (status >= 300 && status < 400)
    return `The server responded with a redirect${entry.raw.response.redirectURL ? ` to ${entry.raw.response.redirectURL}` : ""}.`;
  if (status >= 500) return "The server failed while handling this request.";
  return null;
}

export const TIMING_PHASES: {
  key: keyof NonNullable<HarEntry["timings"]>;
  label: string;
  explain: string;
}[] = [
  {
    key: "blocked",
    label: "Blocked",
    explain: "Queued in the browser before the request could start.",
  },
  { key: "dns", label: "DNS", explain: "Looking up the server's IP address." },
  {
    key: "connect",
    label: "Connect",
    explain: "Opening a TCP connection to the server.",
  },
  {
    key: "ssl",
    label: "TLS",
    explain: "Negotiating the encrypted HTTPS connection.",
  },
  { key: "send", label: "Send", explain: "Sending the request to the server." },
  {
    key: "wait",
    label: "Waiting (TTFB)",
    explain: "Time spent waiting for the server to begin responding.",
  },
  {
    key: "receive",
    label: "Receive",
    explain: "Downloading the response content.",
  },
];
