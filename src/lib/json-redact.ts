import { validateJson, assignKey } from "./json.ts";

export interface SanitizeOptions {
  /**
   * Key names whose values should be redacted. Matching is case-insensitive.
   * Ignored when hideAllValues is true; use excludedKeys to expose values.
   */
  sensitiveKeys: string[];
  /** Replacement value inserted in place of sensitive data. */
  redactionValue: string | null;
  /** How key names are matched. */
  matchMode: "exact" | "contains";
  /**
   * When true (the UI's "hide all values" toggle) every leaf value is redacted
   * — including items of primitive arrays and keys added after the toggle was
   * enabled. A bare root value or key-less root array is fully redacted.
   */
  hideAllValues?: boolean;
  /**
   * Keys to leave visible while hideAllValues is true. Matching is
   * case-insensitive and exact so removing a key reliably exposes its subtree.
   */
  excludedKeys?: string[];
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

function matchesKey(
  key: string,
  pattern: string,
  mode: SanitizeOptions["matchMode"],
): boolean {
  const k = key.toLowerCase();
  const p = pattern.trim().toLowerCase();
  if (!p) return false;
  return mode === "exact" ? k === p : k.includes(p);
}

/** Stringify a value without crashing on circular references (renders them as "[Circular]"). */
function stringifySafe(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, val) => {
      if (val !== null && typeof val === "object") {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    },
    2,
  );
}

interface RedactState {
  options: SanitizeOptions;
  count: number;
  paths: string[];
  seen: WeakMap<object, unknown>;
}

function redact(
  value: unknown,
  path: string,
  state: RedactState,
  force: boolean,
  hideUnkeyed = false,
  hideAll = false,
): unknown {
  const { options } = state;

  if (Array.isArray(value)) {
    if (state.seen.has(value)) return state.seen.get(value);
    const copy: unknown[] = [];
    state.seen.set(value, copy);
    value.forEach((item, i) => {
      const itemPath = `${path}[${i}]`;
      // Primitive items have no key of their own, so hide-all must redact
      // them independently from key-based redaction of object properties.
      if (
        (force || hideUnkeyed) &&
        (item === null || typeof item !== "object")
      ) {
        copy.push(options.redactionValue);
        state.count++;
        if (state.paths.length < MAX_REDACTED_PATHS) state.paths.push(itemPath);
      } else {
        copy.push(
          redact(
            item,
            itemPath,
            state,
            force,
            hideUnkeyed && Array.isArray(item),
            hideAll,
          ),
        );
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
      const inList = options.sensitiveKeys.some((pattern) =>
        matchesKey(key, pattern, options.matchMode),
      );
      const excluded =
        hideAll &&
        (options.excludedKeys ?? []).some((pattern) =>
          matchesKey(key, pattern, "exact"),
        );
      const shouldRedact = hideAll ? !excluded : force || inList;

      if (isContainer) {
        // Containers always recurse so nested structure survives. In hide-all
        // mode each key decides from the exclusion list, so newly added keys
        // stay hidden without relying on a snapshot of keys. An excluded key
        // turns hide-all off for its whole subtree.
        const childHideAll = hideAll && !excluded;
        const childForce = hideAll ? false : force || inList;
        const childHideUnkeyed = childHideAll && Array.isArray(val);
        assignKey(
          out,
          key,
          redact(val, keyPath, state, childForce, childHideUnkeyed, childHideAll),
        );
      } else if (shouldRedact) {
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
export function redactJson(
  jsonText: string,
  options: SanitizeOptions,
): SanitizeResult {
  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { output: "", redactedCount: 0, redactedPaths: [], inputChars: 0 };
  }

  const { valid, parsed, error } = validateJson(trimmed);
  if (!valid) {
    throw new Error(error ?? "Invalid JSON");
  }

  const state: RedactState = {
    options,
    count: 0,
    paths: [],
    seen: new WeakMap(),
  };

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
    options.hideAllValues === true &&
    Array.isArray(parsed) &&
    collectAllKeys(parsed).length === 0;
  const sanitized = redact(
    parsed,
    "",
    state,
    rootForce,
    options.hideAllValues === true && Array.isArray(parsed),
    options.hideAllValues === true,
  );

  return {
    output: stringifySafe(sanitized),
    redactedCount: state.count,
    redactedPaths: state.paths,
    inputChars: trimmed.length,
  };
}
