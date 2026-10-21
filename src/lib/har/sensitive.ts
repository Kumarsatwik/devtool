import type { HarEntry, SensitiveFinding } from "./types.ts";

export const SENSITIVE_HEADER =
  /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|x-auth-token|x-csrf-token|x-xsrf-token|x-session|x-access-token)$/i;

export const SENSITIVE_KEY =
  /(pass(word)?|passwd|pwd|secret|token|api[-_]?key|apikey|session|credential|private[-_]?key|client[-_]?secret|ssn|card[-_]?number|cvv|auth)/i;

const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

/**
 * Mask a sensitive value while preserving its general shape:
 * keeps the first and last characters, masks the middle with bullets,
 * and keeps the length when reasonable. Short values (<= 4 chars) and
 * empty strings are fully hidden so nothing leaks.
 */
export function maskValue(value: string): string {
  if (value.length === 0) return "••••••••";
  if (value.length <= 4) return "•".repeat(Math.min(value.length, 4));

  // Very long values: cap the masked span so the UI stays readable.
  const maxLen = 64;
  const keep = Math.max(1, Math.min(2, Math.floor(value.length / 8)));
  if (value.length > maxLen) {
    return `${value.slice(0, keep)}${"•".repeat(8)}${value.slice(-keep)}`;
  }
  return `${value.slice(0, keep)}${"•".repeat(value.length - keep * 2)}${value.slice(-keep)}`;
}

export function isSensitiveHeader(name: string, value: string): boolean {
  return SENSITIVE_HEADER.test(name) || JWT_PATTERN.test(value);
}

const BODY_SCAN_LIMIT = 512 * 1024;

export function detectSensitive(entry: HarEntry): SensitiveFinding[] {
  const findings: SensitiveFinding[] = [];
  const seen = new Set<string>();
  const push = (where: string, name: string, value: string, reason: string) => {
    const key = `${where}|${name}|${value.slice(0, 40)}`;
    if (seen.has(key) || findings.length >= 20) return;
    seen.add(key);
    findings.push({ where, name, value, reason });
  };

  for (const h of entry.request.headers ?? []) {
    if (SENSITIVE_HEADER.test(h.name))
      push("Request header", h.name, h.value, "Sensitive header");
    else if (JWT_PATTERN.test(h.value))
      push("Request header", h.name, h.value, "Looks like a JWT");
  }
  for (const h of entry.response.headers ?? []) {
    if (h.name.toLowerCase() === "set-cookie")
      push("Response header", "Set-Cookie", h.value, "Sets a cookie");
  }
  for (const c of entry.request.cookies ?? []) {
    push("Request cookie", c.name, c.value, "Cookie sent by the browser");
  }
  for (const c of entry.response.cookies ?? []) {
    if (c.value)
      push("Response cookie", c.name, c.value, "Cookie set by the server");
  }

  const post = entry.request.postData;
  const body = post?.text;
  if (body && body.length <= BODY_SCAN_LIMIT) {
    const mime = (post?.mimeType ?? "").toLowerCase();
    if (mime.includes("json") || /^[{[]/.test(body.trim())) {
      try {
        const walk = (node: unknown, path: string, depth: number) => {
          if (depth > 3 || node === null || node === undefined) return;
          if (Array.isArray(node)) {
            node
              .slice(0, 10)
              .forEach((v, i) => walk(v, `${path}[${i}]`, depth + 1));
            return;
          }
          if (typeof node === "object") {
            for (const [k, v] of Object.entries(
              node as Record<string, unknown>,
            )) {
              const keyPath = path ? `${path}.${k}` : k;
              if (typeof v === "string" || typeof v === "number") {
                const sv = String(v);
                if (SENSITIVE_KEY.test(k))
                  push(
                    "Request body",
                    keyPath,
                    sv,
                    "Field name suggests sensitive data",
                  );
                else if (JWT_PATTERN.test(sv))
                  push("Request body", keyPath, sv, "Looks like a JWT");
                else if (
                  EMAIL_PATTERN.test(sv) &&
                  /(email|user|login|account)/i.test(k)
                )
                  push("Request body", keyPath, sv, "Email address");
              } else {
                walk(v, keyPath, depth + 1);
              }
            }
          }
        };
        walk(JSON.parse(body), "", 0);
      } catch {
        /* not parseable JSON — fall through to raw scan */
        if (JWT_PATTERN.test(body))
          push(
            "Request body",
            "body",
            body.match(JWT_PATTERN)![0],
            "Looks like a JWT",
          );
      }
    } else if (mime.includes("urlencoded")) {
      for (const pair of body.split("&")) {
        const eq = pair.indexOf("=");
        if (eq < 0) continue;
        const k = decodeURIComponent(pair.slice(0, eq).replace(/\+/g, " "));
        const v = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " "));
        if (SENSITIVE_KEY.test(k))
          push("Request body", k, v, "Field name suggests sensitive data");
      }
    } else if (JWT_PATTERN.test(body)) {
      push(
        "Request body",
        "body",
        body.match(JWT_PATTERN)![0],
        "Looks like a JWT",
      );
    }
  }

  return findings;
}
