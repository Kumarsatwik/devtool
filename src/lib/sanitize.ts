import { validateJSON, assignKey } from "@/lib/json";

export interface SanitizeOptions {
  /** Key names whose values should be redacted. Matching is case-insensitive. */
  sensitiveKeys: string[];
  /** Replacement value inserted in place of sensitive data. */
  redactionValue: string | null;
  /** How key names are matched. */
  matchMode: "exact" | "contains";
  /**
   * When true (the UI's "hide all values" toggle) the UI populates the key
   * list with every key, so all leaf values are redacted — including items of
   * primitive arrays — except those the user removes from the list afterwards.
   * A bare root value or key-less root array is fully redacted.
   */
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

interface RedactState {
  options: SanitizeOptions;
  count: number;
  paths: string[];
  seen: WeakMap<object, unknown>;
}

function redact(value: unknown, path: string, state: RedactState, force: boolean): unknown {
  const { options } = state;

  if (Array.isArray(value)) {
    if (state.seen.has(value)) return state.seen.get(value);
    const copy: unknown[] = [];
    state.seen.set(value, copy);
    value.forEach((item, i) => {
      const itemPath = `${path}[${i}]`;
      // Primitive items have no key of their own — when redaction was forced
      // by an ancestor sensitive key (or hide-all), they are hidden too.
      if (force && (item === null || typeof item !== "object")) {
        copy.push(options.redactionValue);
        state.count++;
        if (state.paths.length < MAX_REDACTED_PATHS) state.paths.push(itemPath);
      } else {
        copy.push(redact(item, itemPath, state, force));
      }
    });
    return copy;
  }

  if (value !== null && typeof value === "object") {
    if (state.seen.has(value)) return state.seen.get(value);
    const out: Record<string, unknown> = {};
    state.seen.set(value, out);
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const keyPath = path ? `${path}.${key}` : key;
      const isContainer = val !== null && typeof val === "object";
      const inList = options.sensitiveKeys.some((pattern) => matchesKey(key, pattern, options.matchMode));

      if (isContainer) {
        // Containers always recurse so nested structure survives. A sensitive
        // key also forces redaction of every leaf inside its subtree — this
        // fixes the old leak where `{"emails": ["a@b.c"]}` or
        // `{"authorization": {"bearer": "…"}}` slipped through untouched.
        // In hide-all mode the leaf redaction still comes from the (fully
        // populated) key list, so removing a key from the list keeps
        // un-hiding it; primitive arrays directly under a listed key are the
        // exception — their items have no key of their own to match.
        const childForce = force || (inList && (!options.hideAllValues || Array.isArray(val)));
        assignKey(out, key, redact(val, keyPath, state, childForce));
      } else if (force || inList) {
        assignKey(out, key, options.redactionValue);
        state.count++;
        if (state.paths.length < MAX_REDACTED_PATHS) state.paths.push(keyPath);
      } else {
        assignKey(out, key, val);
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

  const state: RedactState = { options, count: 0, paths: [], seen: new WeakMap() };

  // A bare root value (or a root array with no object keys at all) has no key
  // names to match, so hide-all redacts it wholesale.
  const rootIsContainer = parsed !== null && typeof parsed === "object";
  if (!rootIsContainer && options.hideAllValues) {
    return {
      output: stringifySafe(options.redactionValue),
      redactedCount: 1,
      redactedPaths: ["(root)"],
      inputChars: trimmed.length,
    };
  }
  const rootForce =
    options.hideAllValues === true && Array.isArray(parsed) && collectAllKeys(parsed).length === 0;
  const sanitized = redact(parsed, "", state, rootForce);

  return {
    output: stringifySafe(sanitized),
    redactedCount: state.count,
    redactedPaths: state.paths,
    inputChars: trimmed.length,
  };
}
