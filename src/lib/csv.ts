import Papa from "papaparse";

export interface CsvParseOptions {
  dynamicTyping?: boolean;
  delimiter?: string;
  failOnError?: boolean;
}

export interface CsvParseResult {
  data: Record<string, unknown>[];
  headers: string[];
  errors: Papa.ParseError[];
}

export function parseCsv(
  csvText: string,
  options: CsvParseOptions = {},
): CsvParseResult {
  const result = Papa.parse<Record<string, unknown>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: options.dynamicTyping ?? false,
    delimiter: options.delimiter,
  });

  if (options.failOnError && result.errors.length > 0) {
    const firstError = result.errors[0];
    const rowInfo =
      firstError.row !== undefined ? ` (Row: ${firstError.row + 1})` : "";
    throw new Error(`${firstError.message}${rowInfo}`);
  }

  return {
    data: result.data,
    headers: result.meta.fields || [],
    errors: result.errors,
  };
}

export function jsonToCsv(jsonData: unknown): string {
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
