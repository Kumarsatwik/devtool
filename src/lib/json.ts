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

export interface DiffItem {
  path: string;
  type: "added" | "removed" | "modified";
  oldValue?: unknown;
  newValue?: unknown;
}

export function compareJSON(json1: string, json2: string): DiffItem[] {
  const result1 = validateJSON(json1);
  const result2 = validateJSON(json2);

  if (!result1.valid) throw new Error("First JSON is invalid");
  if (!result2.valid) throw new Error("Second JSON is invalid");

  const obj1 = result1.parsed as Record<string, unknown>;
  const obj2 = result2.parsed as Record<string, unknown>;
  const diffs: DiffItem[] = [];

  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const inObj1 = key in obj1;
    const inObj2 = key in obj2;

    if (inObj2 && !inObj1) {
      diffs.push({ path: key, type: "added", newValue: obj2[key] });
    } else if (inObj1 && !inObj2) {
      diffs.push({ path: key, type: "removed", oldValue: obj1[key] });
    } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      diffs.push({ path: key, type: "modified", oldValue: obj1[key], newValue: obj2[key] });
    }
  }

  return diffs;
}