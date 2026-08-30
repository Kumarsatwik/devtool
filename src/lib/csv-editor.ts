import Papa from "papaparse";

export interface TableData {
  headers: string[];
  rows: string[][];
}

export type Density = "compact" | "normal" | "roomy";
export type AlignMode = "left" | "center" | "right";
export type BorderMode = "none" | "horizontal" | "grid";

export interface TableStyle {
  fontFamily: string;
  fontSize: number;
  tableBg: string;
  headerBg: string;
  headerColor: string;
  bodyColor: string;
  stripeEnabled: boolean;
  stripeColor: string;
  borderColor: string;
  density: Density;
  align: AlignMode;
  borders: BorderMode;
}

export const FONT_OPTIONS = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

export const DEFAULT_STYLE: TableStyle = {
  fontFamily: FONT_OPTIONS[0].value,
  fontSize: 13,
  tableBg: "#ffffff",
  headerBg: "#f4f4f5",
  headerColor: "#18181b",
  bodyColor: "#3f3f46",
  stripeEnabled: true,
  stripeColor: "#fafafa",
  borderColor: "#e4e4e7",
  density: "normal",
  align: "left",
  borders: "horizontal",
};

export interface StylePreset {
  name: string;
  style: Partial<TableStyle>;
}

export const STYLE_PRESETS: StylePreset[] = [
  { name: "Clean", style: {} },
  {
    name: "Striped",
    style: {
      stripeEnabled: true,
      stripeColor: "#f1f5f9",
      borderColor: "#e2e8f0",
    },
  },
  {
    name: "Bold Header",
    style: {
      headerBg: "#111827",
      headerColor: "#ffffff",
      stripeEnabled: false,
      borders: "horizontal",
      borderColor: "#cbd5e1",
    },
  },
  {
    name: "Midnight",
    style: {
      tableBg: "#18181b",
      headerBg: "#27272a",
      headerColor: "#fafafa",
      bodyColor: "#d4d4d8",
      stripeEnabled: true,
      stripeColor: "#1f1f23",
      borderColor: "#3f3f46",
    },
  },
  {
    name: "Minimal",
    style: {
      stripeEnabled: false,
      borders: "none",
      headerBg: "#ffffff",
      headerColor: "#111111",
      borderColor: "#d4d4d8",
    },
  },
  {
    name: "Notebook",
    style: {
      fontFamily: FONT_OPTIONS[3].value,
      headerBg: "#fef3c7",
      headerColor: "#78350f",
      bodyColor: "#44403c",
      stripeEnabled: true,
      stripeColor: "#fffbeb",
      borderColor: "#fde68a",
    },
  },
];

export function applyPreset(preset: StylePreset): TableStyle {
  return { ...DEFAULT_STYLE, ...preset.style };
}

export function densityPadding(density: Density): string {
  switch (density) {
    case "compact":
      return "4px 10px";
    case "roomy":
      return "14px 18px";
    default:
      return "9px 14px";
  }
}

function generatedName(index: number): string {
  return `Column ${index + 1}`;
}

export function createEmptyTable(rows = 3, cols = 3): TableData {
  return {
    headers: Array.from({ length: cols }, (_, i) => generatedName(i)),
    rows: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => "")
    ),
  };
}

function normalize(headers: string[], rows: string[][]): TableData {
  let width = headers.length;
  for (const row of rows) {
    if (row.length > width) width = row.length;
  }
  if (width === 0) width = 1;

  const safeHeaders = Array.from({ length: width }, (_, i) => {
    const name = (headers[i] ?? "").trim();
    return name === "" ? generatedName(i) : name;
  });

  const safeRows = rows.map((row) =>
    Array.from({ length: width }, (_, i) => row[i] ?? "")
  );

  return { headers: safeHeaders, rows: safeRows };
}

export function parseCsvTable(text: string): TableData {
  const result = Papa.parse<string[]>(text.trim(), {
    header: false,
    skipEmptyLines: "greedy",
  });
  const matrix = result.data as unknown as string[][];
  if (!matrix || matrix.length === 0) {
    throw new Error("The CSV file appears to be empty");
  }
  const [rawHeaders, ...rest] = matrix;
  if (!rawHeaders || rawHeaders.every((cell) => !String(cell).trim())) {
    throw new Error("The CSV file is missing a header row");
  }
  return normalize(rawHeaders ?? [], rest);
}

export function tableToCsv(table: TableData): string {
  return Papa.unparse({ fields: table.headers, data: table.rows });
}

export function setCell(
  table: TableData,
  rowIdx: number,
  colIdx: number,
  value: string
): TableData {
  return {
    ...table,
    rows: table.rows.map((row, r) =>
      r !== rowIdx
        ? row
        : row.map((cell, c) => (c === colIdx ? value : cell))
    ),
  };
}

export function setHeaderCell(
  table: TableData,
  colIdx: number,
  value: string
): TableData {
  return {
    ...table,
    headers: table.headers.map((h, c) => (c === colIdx ? value : h)),
  };
}

export function insertColumn(table: TableData, at: number): TableData {
  const headers = [...table.headers];
  headers.splice(at, 0, generatedName(headers.length));
  const rows = table.rows.map((row) => {
    const next = [...row];
    next.splice(at, 0, "");
    return next;
  });
  return { headers, rows };
}

export function deleteColumn(table: TableData, at: number): TableData {
  if (table.headers.length <= 1) {
    return createEmptyTable(0, 1);
  }
  const headers = table.headers.filter((_, c) => c !== at);
  const rows = table.rows.map((row) => row.filter((_, c) => c !== at));
  return { headers, rows };
}

export function moveColumn(
  table: TableData,
  from: number,
  to: number
): TableData {
  if (to < 0 || to >= table.headers.length || from === to) return table;
  const headers = [...table.headers];
  const [h] = headers.splice(from, 1);
  headers.splice(to, 0, h);
  const rows = table.rows.map((row) => {
    const next = [...row];
    const [cell] = next.splice(from, 1);
    next.splice(to, 0, cell);
    return next;
  });
  return { headers, rows };
}

function blankRow(width: number): string[] {
  return Array.from({ length: width }, () => "");
}

export function appendRow(table: TableData): TableData {
  return { ...table, rows: [...table.rows, blankRow(table.headers.length)] };
}

export function insertRowBelow(table: TableData, at: number): TableData {
  const rows = [...table.rows];
  rows.splice(at + 1, 0, blankRow(table.headers.length));
  return { ...table, rows };
}

export function duplicateRow(table: TableData, at: number): TableData {
  const rows = [...table.rows];
  rows.splice(at + 1, 0, [...rows[at]]);
  return { ...table, rows };
}

export function deleteRow(table: TableData, at: number): TableData {
  return { ...table, rows: table.rows.filter((_, r) => r !== at) };
}

export function moveRow(table: TableData, from: number, to: number): TableData {
  if (to < 0 || to >= table.rows.length || from === to) return table;
  const rows = [...table.rows];
  const [row] = rows.splice(from, 1);
  rows.splice(to, 0, row);
  return { ...table, rows };
}

/* ---------- bulk row / column operations ---------- */

export function deleteRows(table: TableData, indices: number[]): TableData {
  if (indices.length === 0) return table;
  const set = new Set(indices);
  return { ...table, rows: table.rows.filter((_, r) => !set.has(r)) };
}

export function deleteColumns(table: TableData, indices: number[]): TableData {
  if (indices.length === 0) return table;
  const set = new Set(indices);
  if (table.headers.length - set.size <= 0) {
    return createEmptyTable(0, 1);
  }
  const headers = table.headers.filter((_, c) => !set.has(c));
  const rows = table.rows.map((row) => row.filter((_, c) => !set.has(c)));
  return { headers, rows };
}

export function clearRows(table: TableData, indices: number[]): TableData {
  if (indices.length === 0) return table;
  const set = new Set(indices);
  return {
    ...table,
    rows: table.rows.map((row, r) =>
      set.has(r) ? row.map(() => "") : row
    ),
  };
}

export function clearColumns(table: TableData, indices: number[]): TableData {
  if (indices.length === 0) return table;
  const set = new Set(indices);
  return {
    ...table,
    rows: table.rows.map((row) =>
      row.map((cell, c) => (set.has(c) ? "" : cell))
    ),
  };
}

export function fillRows(
  table: TableData,
  indices: number[],
  value: string
): TableData {
  if (indices.length === 0) return table;
  const set = new Set(indices);
  return {
    ...table,
    rows: table.rows.map((row, r) =>
      set.has(r) ? row.map(() => value) : row
    ),
  };
}

export function fillColumns(
  table: TableData,
  indices: number[],
  value: string
): TableData {
  if (indices.length === 0) return table;
  const set = new Set(indices);
  return {
    ...table,
    rows: table.rows.map((row) =>
      row.map((cell, c) => (set.has(c) ? value : cell))
    ),
  };
}

export function duplicateRows(table: TableData, indices: number[]): TableData {
  if (indices.length === 0) return table;
  const rows: string[][] = [];
  table.rows.forEach((row, r) => {
    rows.push(row);
    if (indices.includes(r)) {
      rows.push([...row]);
    }
  });
  return { ...table, rows };
}

export function moveRowsTo(
  table: TableData,
  indices: number[],
  to: number
): TableData {
  if (indices.length === 0) return table;
  const selectedSet = new Set(indices);
  const selected = table.rows.filter((_, r) => selectedSet.has(r));
  const remaining = table.rows.filter((_, r) => !selectedSet.has(r));
  const clampedTo = Math.max(0, Math.min(to, remaining.length));
  const rows = [...remaining.slice(0, clampedTo), ...selected, ...remaining.slice(clampedTo)];
  return { ...table, rows };
}

export function moveColumnsTo(
  table: TableData,
  indices: number[],
  to: number
): TableData {
  if (indices.length === 0) return table;
  const selectedSet = new Set(indices);
  const headers = table.headers.filter((_, c) => !selectedSet.has(c));
  const selectedHeaders = table.headers.filter((_, c) => selectedSet.has(c));
  const clampedTo = Math.max(0, Math.min(to, headers.length));
  const nextHeaders = [
    ...headers.slice(0, clampedTo),
    ...selectedHeaders,
    ...headers.slice(clampedTo),
  ];

  const rows = table.rows.map((row) => {
    const remaining = row.filter((_, c) => !selectedSet.has(c));
    const selected = row.filter((_, c) => selectedSet.has(c));
    return [...remaining.slice(0, clampedTo), ...selected, ...remaining.slice(clampedTo)];
  });

  return { headers: nextHeaders, rows };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellBorders(
  style: TableStyle,
  kind: "header" | "body"
): string {
  const b = `1px solid ${style.borderColor}`;
  if (style.borders === "grid") {
    return `border-right:${b};border-bottom:${b};`;
  }
  if (style.borders === "horizontal" && kind === "body") {
    return `border-bottom:${b};`;
  }
  return "";
}

export function buildStyledTableHtml(
  table: TableData,
  style: TableStyle
): string {
  const pad = densityPadding(style.density);
  const align = `text-align:${style.align};`;

  const thBase = [
    `background:${style.headerBg}`,
    `color:${style.headerColor}`,
    `padding:${pad}`,
    align,
    "font-weight:700",
    `border-bottom:2px solid ${style.borderColor}`,
    cellBorders(style, "header"),
    "vertical-align:top",
  ].join(";");

  const head = table.headers
    .map((h) => `<th style="${thBase}">${escapeHtml(h)}</th>`)
    .join("");

  const body = table.rows
    .map((row, r) => {
      const striped = style.stripeEnabled && r % 2 === 1;
      const bg = striped ? style.stripeColor : style.tableBg;
      const tds = row
        .map((cell) => {
          const td = [
            `background:${bg}`,
            `color:${style.bodyColor}`,
            `padding:${pad}`,
            align,
            cellBorders(style, "body"),
            "vertical-align:top",
          ].join(";");
          return `<td style="${td}">${escapeHtml(cell)}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  const outer =
    style.borders === "grid" ? `border:1px solid ${style.borderColor};` : "";

  return `<table style="border-collapse:collapse;${outer}font-family:${style.fontFamily};font-size:${style.fontSize}px;background:${style.tableBg};"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function fileBaseName(name: string | null): string {
  const base = (name ?? "table").replace(/\.[^.]+$/, "").trim();
  return base === "" ? "table" : base;
}

/* ---------- sorting ---------- */

export type SortDir = "asc" | "desc";

function compareCells(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  const aNum = a.trim() !== "" && !Number.isNaN(na);
  const bNum = b.trim() !== "" && !Number.isNaN(nb);
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  if (a.trim() === "" && b.trim() !== "") return 1;
  if (b.trim() === "" && a.trim() !== "") return -1;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Returns original row indices ordered by the given column. */
export function sortedRowIndices(
  table: TableData,
  col: number,
  dir: SortDir
): number[] {
  const indices = table.rows.map((_, r) => r);
  const factor = dir === "asc" ? 1 : -1;
  // Stable sort (ES2019+ guarantees stability)
  return indices.sort(
    (a, b) => factor * compareCells(table.rows[a][col] ?? "", table.rows[b][col] ?? "")
  );
}

/* ---------- find & replace ---------- */

export interface ReplaceResult {
  table: TableData;
  count: number;
}

export function replaceEverywhere(
  table: TableData,
  find: string,
  replaceWith: string,
  matchCase = false
): ReplaceResult {
  if (find === "") return { table, count: 0 };
  let count = 0;
  const needle = matchCase ? find : find.toLowerCase();
  const swap = (cell: string): string => {
    const hay = matchCase ? cell : cell.toLowerCase();
    let out = "";
    let i = 0;
    while (i < hay.length) {
      const at = hay.indexOf(needle, i);
      if (at === -1) {
        out += cell.slice(i);
        break;
      }
      out += cell.slice(i, at) + replaceWith;
      i = at + needle.length;
      count += 1;
    }
    return out;
  };
  return {
    table: {
      headers: table.headers.map(swap),
      rows: table.rows.map((row) => row.map(swap)),
    },
    count,
  };
}

export function countMatches(
  table: TableData,
  query: string,
  matchCase = false
): number {
  if (query === "") return 0;
  const needle = matchCase ? query : query.toLowerCase();
  let count = 0;
  const scan = (cells: string[]) => {
    for (const cell of cells) {
      const hay = matchCase ? cell : cell.toLowerCase();
      let i = 0;
      while ((i = hay.indexOf(needle, i)) !== -1) {
        count += 1;
        i += needle.length;
      }
    }
  };
  scan(table.headers);
  scan(table.rows.flat());
  return count;
}

export function filterRowIndices(
  table: TableData,
  query: string,
  matchCase = false
): number[] {
  if (query.trim() === "") return table.rows.map((_, r) => r);
  const needle = matchCase ? query : query.toLowerCase();
  return table.rows
    .map((row, r) => ({ row, r }))
    .filter(({ row }) =>
      row.some((cell) => (matchCase ? cell : cell.toLowerCase()).includes(needle))
    )
    .map(({ r }) => r);
}

/* ---------- clipboard formats ---------- */

export function tableToTsv(table: TableData): string {
  const esc = (v: string) => v.replace(/\t/g, " ").replace(/\n/g, " ");
  return [table.headers, ...table.rows]
    .map((row) => row.map(esc).join("\t"))
    .join("\n");
}

function escapeMdCell(v: string): string {
  return v.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function tableToMarkdown(table: TableData): string {
  const head = `| ${table.headers.map(escapeMdCell).join(" | ")} |`;
  const sep = `| ${table.headers.map(() => "---").join(" | ")} |`;
  const body = table.rows
    .map((row) => `| ${row.map(escapeMdCell).join(" | ")} |`)
    .join("\n");
  return `${head}\n${sep}${body ? "\n" + body : ""}`;
}
