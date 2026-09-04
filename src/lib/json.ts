
export interface ValidationResult {
  valid: boolean;
  error?: string;
  parsed?: unknown;
}

export function validateJSON(jsonText: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonText);
    return { valid: true, parsed };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Invalid JSON";
    return { valid: false, error };
  }
}

export function beautifyJSON(jsonText: string, spaces: number | string = 2): string {
  const { valid, parsed, error } = validateJSON(jsonText);
  if (!valid) {
    throw new Error(error);
  }
  return JSON.stringify(parsed, null, spaces);
}

export function minifyJSON(jsonText: string): string {
  const { valid, parsed, error } = validateJSON(jsonText);
  if (!valid) {
    throw new Error(error);
  }
  return JSON.stringify(parsed);
}

export function jsToJSON(jsText: string, spaces: number | string = 2): string {
  const trimmed = jsText.trim();
  if (!trimmed) return "";

  // Wrap object literals in parentheses so they are parsed as expressions
  // rather than block statements.
  const wrapped = trimmed.startsWith("{") ? `(${trimmed})` : trimmed;

  const value = new Function(`"use strict"; return (${wrapped});`)();

  return JSON.stringify(value, null, spaces);
}

export interface DiffItem {
  path: string;
  type: "added" | "removed" | "modified";
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  total: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function formatPathPart(key: string | number): string {
  return typeof key === "number" || /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
    ? String(key)
    : JSON.stringify(String(key));
}

function deepDiff(
  a: unknown,
  b: unknown,
  path: string,
  diffs: DiffItem[],
): void {
  if (Object.is(a, b)) return;

  const bothObjects = isPlainObject(a) && isPlainObject(b);
  const bothArrays = Array.isArray(a) && Array.isArray(b);

  if (bothObjects) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      const childPath = path ? `${path}.${formatPathPart(key)}` : formatPathPart(key);
      const inA = key in (a as Record<string, unknown>);
      const inB = key in (b as Record<string, unknown>);
      if (inA && inB) {
        deepDiff(a[key], b[key], childPath, diffs);
      } else if (inB) {
        diffs.push({ path: childPath, type: "added", newValue: b[key] });
      } else {
        diffs.push({ path: childPath, type: "removed", oldValue: a[key] });
      }
    }
    return;
  }

  if (bothArrays && a.length === b.length) {
    for (let i = 0; i < a.length; i++) {
      deepDiff(a[i], b[i], `${path}[${i}]`, diffs);
    }
    return;
  }

  diffs.push({ path: path || "(root)", type: "modified", oldValue: a, newValue: b });
}

/**
 * Deep structural diff between two JSON documents. Produces one entry
 * per changed leaf with a full path (e.g. `environment.port` or
 * `modules[1]`), recursing into nested objects and aligned arrays.
 */
export function compareJSON(json1: string, json2: string): DiffItem[] {
  const result1 = validateJSON(json1);
  const result2 = validateJSON(json2);

  if (!result1.valid) throw new Error("First JSON is invalid");
  if (!result2.valid) throw new Error("Second JSON is invalid");

  const diffs: DiffItem[] = [];
  deepDiff(result1.parsed, result2.parsed, "", diffs);
  return diffs;
}

export function summarizeDiff(diffs: DiffItem[]): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, modified: 0, total: diffs.length };
  for (const d of diffs) summary[d.type]++;
  return summary;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function sortJSONKeys(jsonText: string, spaces: number | string = 2): string {
  const trimmed = jsonText.trim();
  if (!trimmed) return "";
  const { valid, parsed, error } = validateJSON(trimmed);
  if (!valid) {
    throw new Error(error);
  }
  const sorted = sortKeysDeep(parsed);
  return JSON.stringify(sorted, null, spaces);
}
