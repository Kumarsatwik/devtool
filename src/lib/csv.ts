import Papa from "papaparse";

export interface CSVParseResult {
  data: Record<string, string>[];
  headers: string[];
  errors: Papa.ParseError[];
}

export function parseCSV(csvText: string): CSVParseResult {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return {
    data: result.data,
    headers: result.meta.fields || [],
    errors: result.errors,
  };
}

export function csvToJSON(csvText: string): string {
  const { data } = parseCSV(csvText);
  return JSON.stringify(data, null, 2);
}

export function jsonToCSV(jsonData: unknown): string {
  if (!Array.isArray(jsonData)) {
    throw new Error("Input must be an array");
  }

  if (jsonData.length === 0) {
    throw new Error("Array is empty");
  }

  const stringifyCell = (value: unknown): string => {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Unserializable]";
    }
  };

  const flattened = jsonData.map((item) => {
    if (item === null || typeof item !== "object") return item;
    return Object.fromEntries(
      Object.entries(item).map(([key, value]) => [
        key,
        value !== null && typeof value === "object" ? stringifyCell(value) : value,
      ])
    );
  });

  return Papa.unparse(flattened);
}