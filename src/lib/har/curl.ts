import type { HarEntry } from "./types.ts";

/** Build a POSIX shell curl command that approximates the recorded request. */
export function buildCurl(entry: HarEntry): string {
  const method = (entry.request.method || "GET").toUpperCase();
  if (!/^[A-Z][A-Z-]*$/.test(method)) {
    return "# Unsupported HTTP method — cURL command not generated";
  }

  const url = entry.request.url;
  const headers = entry.request.headers ?? [];
  const postData = entry.request.postData;

  const parts: string[] = ["curl"];
  if (method !== "GET") parts.push("-X", shellQuote(method));
  parts.push("--url", shellQuote(url));

  for (const h of headers) {
    const name = h.name;
    const value = h.value;
    if (/^cookie$/i.test(name)) continue;
    parts.push("-H", shellQuote(`${name}: ${value}`));
  }

  if (postData?.text) {
    parts.push("-d", shellQuote(postData.text));
  } else if (postData?.params?.length) {
    const body = postData.params
      .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`)
      .join("&");
    parts.push("-d", shellQuote(body));
  }

  return parts.join(" ");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
