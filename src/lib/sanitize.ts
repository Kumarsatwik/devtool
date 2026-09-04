import { validateJSON } from "@/lib/json";

export interface SanitizeOptions {
  /** Key names whose values should be redacted. Matching is case-insensitive. */
  sensitiveKeys: string[];
  /** Replacement value inserted in place of sensitive data. */
  redactionValue: string | null;
  /** How key names are matched. */
  matchMode: "exact" | "contains";
  /** When true, every leaf value is redacted, regardless of sensitiveKeys. */
  hideAllValues?: boolean;
}

export interface SanitizeResult {
  /** Sanitized, pretty-printed JSON. */
  output: string;
  /** Number of values redacted. */
  redactedCount: number;
  /** JSON paths of redacted values (capped). */
  redactedPaths: string[];
  /** Total size in characters of the original input. */
  inputChars: number;
}

/** Built-in keys commonly found in API responses and database records. */
export const PRESET_SENSITIVE_KEYS = [
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "api_key",
  "apikey",
  "authorization",
  "ssn",
  "creditCard",
  "cardNumber",
  "cvv",
  "privateKey",
  "clientSecret",
  "sessionId",
  "cookie",
  "set-cookie",
  "auth",
  "bearer",
];

const MAX_REDACTED_PATHS = 50;

function matchesKey(key: string, pattern: string, mode: SanitizeOptions["matchMode"]): boolean {
  const k = key.toLowerCase();
  const p = pattern.trim().toLowerCase();
  if (!p) return false;
  return mode === "exact" ? k === p : k.includes(p);
}

/** Stringify a value without crashing on circular references (renders them as "[Circular]"). */
function stringifySafe(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, val) => {
    if (val !== null && typeof val === "object") {
      if (seen.has(val)) return "[Circular]";
      seen.add(val);
    }
    return val;
  }, 2);
}

function redact(
  value: unknown,
  path: string,
  options: SanitizeOptions,
  result: { count: number; paths: string[] },
  seen: WeakMap<object, unknown> = new WeakMap(),
): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const copy: unknown[] = [];
    seen.set(value, copy);
    value.forEach((item, i) => {
      copy.push(redact(item, `${path}[${i}]`, options, result, seen));
    });
    return copy;
  }

  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const out: Record<string, unknown> = {};
    seen.set(value, out);
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const keyPath = path ? `${path}.${key}` : key;
      // Container keys always recurse so nested structure survives; leaf values
      // hide only when their key is in the list. With hideAllValues the list
      // contains every key (populated by the UI), so all leaves are hidden
      // except those the user removed from the list afterwards.
      const isContainer = val !== null && typeof val === "object";
      const inList = options.sensitiveKeys.some((pattern) => matchesKey(key, pattern, options.matchMode));
      const isSensitive = options.hideAllValues ? inList && !isContainer : inList;
      if (isSensitive) {
        out[key] = options.redactionValue;
        result.count++;
        if (result.paths.length < MAX_REDACTED_PATHS) {
          result.paths.push(keyPath);
        }
      } else {
        out[key] = redact(val, keyPath, options, result, seen);
      }
    }
    return out;
  }

  return value;
}

/**
 * Collect every unique key name in a parsed JSON document (case-folded),
 * recursing into objects and arrays. Used by the "hide all values" action.
 */
export function collectAllKeys(value: unknown): string[] {
  const seen = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v !== null && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        seen.add(k.toLowerCase());
        walk(val);
      }
    }
  };
  walk(value);
  return [...seen];
}

/**
 * Sanitize a JSON document by redacting the values of fields whose key names
 * are marked sensitive. Processes nested objects and arrays recursively.
 */
export function sanitizeJson(jsonText: string, options: SanitizeOptions): SanitizeResult {
  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { output: "", redactedCount: 0, redactedPaths: [], inputChars: 0 };
  }

  const { valid, parsed, error } = validateJSON(trimmed);
  if (!valid) {
    throw new Error(error ?? "Invalid JSON");
  }

  const result = { count: 0, paths: [] as string[] };
  const sanitized = redact(parsed, "", options, result);

  return {
    output: stringifySafe(sanitized),
    redactedCount: result.count,
    redactedPaths: result.paths,
    inputChars: trimmed.length,
  };
}
