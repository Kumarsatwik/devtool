/** Max body length rendered in the UI before truncation. */
export const BODY_PREVIEW_LIMIT = 20000;

/**
 * Decode a HAR body (`content.text` / `postData.text`) into a printable string.
 * Handles base64-encoded content; returns null when the body is absent or binary.
 */
export function decodeBody(
  text: string | undefined,
  encoding: string | undefined,
  mimeType: string | undefined,
): string | null {
  if (!text) return null;
  if (encoding === "base64") {
    const mime = (mimeType ?? "").toLowerCase();
    const textual =
      mime.includes("json") ||
      mime.includes("text") ||
      mime.includes("xml") ||
      mime.includes("javascript") ||
      mime.includes("urlencoded") ||
      mime.includes("html") ||
      mime.includes("svg");
    if (!textual) return null;
    try {
      const bin = atob(text);
      return decodeURIComponent(
        Array.from(
          bin,
          (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"),
        ).join(""),
      );
    } catch {
      return null;
    }
  }
  return text;
}

/** True when the body exists but is binary (base64, non-textual). */
export function isBinaryBody(
  encoding: string | undefined,
  mimeType: string | undefined,
  text?: string,
): boolean {
  if (!text || encoding !== "base64") return false;
  return decodeBody(text, encoding, mimeType) === null;
}

/** Pretty-print a body when it parses as JSON; otherwise return it as-is. */
export function prettyBody(body: string, mimeType: string | undefined): string {
  const looksJson =
    (mimeType ?? "").toLowerCase().includes("json") ||
    /^[{[]/.test(body.trim());
  if (!looksJson) return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
