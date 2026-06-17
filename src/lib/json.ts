import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

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

export function unmarshallDynamo(jsonText: string): string {
  const trimmed = jsonText.trim();
  if (!trimmed) return "";
  
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error("Invalid input JSON structure: " + (err instanceof Error ? err.message : String(err)));
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new Error("Input must be a JSON object or array.");
  }

  const safeUnmarshall = (item: any) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Each DynamoDB item must be a JSON object.");
    }
    try {
      return unmarshall(item);
    } catch (err) {
      throw new Error(`Failed to unmarshall item: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const stringifyWithSets = (val: any) => {
    return JSON.stringify(val, (key, value) => {
      if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    }, 2);
  };

  // Case 1: Array of DynamoDB attribute maps
  if (Array.isArray(parsed)) {
    const unmarshalledList = parsed.map(item => safeUnmarshall(item));
    return stringifyWithSets(unmarshalledList);
  }

  // Case 2: Wrapped in "Items" (e.g. Scan or Query output)
  if (parsed.Items && Array.isArray(parsed.Items)) {
    const unmarshalledList = parsed.Items.map((item: any) => safeUnmarshall(item));
    return stringifyWithSets(unmarshalledList);
  }

  // Case 3: Wrapped in "Item" (e.g. GetItem output)
  if (parsed.Item && typeof parsed.Item === "object" && !Array.isArray(parsed.Item)) {
    const unmarshalledItem = safeUnmarshall(parsed.Item);
    return stringifyWithSets(unmarshalledItem);
  }

  // Case 4: A single DynamoDB attribute map
  const unmarshalled = safeUnmarshall(parsed);
  return stringifyWithSets(unmarshalled);
}

export function marshallDynamo(jsonText: string): string {
  const trimmed = jsonText.trim();
  if (!trimmed) return "";
  
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error("Invalid input JSON structure: " + (err instanceof Error ? err.message : String(err)));
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new Error("Input must be a JSON object or array.");
  }

  const safeMarshall = (item: any) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Each standard JSON item must be a JSON object.");
    }
    try {
      return marshall(item, { removeUndefinedValues: true, convertClassInstanceToMap: true });
    } catch (err) {
      throw new Error(`Failed to marshall item: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (Array.isArray(parsed)) {
    const marshalledList = parsed.map(item => safeMarshall(item));
    return JSON.stringify(marshalledList, null, 2);
  }

  const marshalled = safeMarshall(parsed);
  return JSON.stringify(marshalled, null, 2);
}