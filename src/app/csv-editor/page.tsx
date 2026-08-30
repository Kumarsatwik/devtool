"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import {
  TableData,
  TableStyle,
  DEFAULT_STYLE,
  FONT_OPTIONS,
  STYLE_PRESETS,
  StylePreset,
  Density,
  AlignMode,
  BorderMode,
  applyPreset,
  parseCsvTable,
  tableToCsv,
  createEmptyTable,
  setCell,
  setHeaderCell,
  insertColumn,
  deleteColumn,
  moveColumn,
  appendRow,
  duplicateRow,
  deleteRow,
  moveRow,
  deleteRows,
  deleteColumns,
  clearRows,
  clearColumns,
  fillRows,
  fillColumns,
  duplicateRows,
  moveRowsTo,
  moveColumnsTo,
  densityPadding,
  fileBaseName,
  sortedRowIndices,
  filterRowIndices,
  countMatches,
  replaceEverywhere,
  tableToTsv,
  tableToMarkdown,
  SortDir,
} from "@/lib/csv-editor";
import {
  Undo2,
  Redo2,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
  Palette,
  RotateCcw,
  Table as TableIcon,
  FilePlus,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ClipboardList,
  Braces,
  Eraser,
  Paintbrush,
} from "lucide-react";

const PER_PAGE = 25;
const HISTORY_LIMIT = 50;

interface SortState {
  col: number;
  dir: SortDir;
}
type CopyFormat = "csv" | "tsv" | "markdown" | "json";

type ExportKind = "csv" | "xlsx";

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex border border-border rounded overflow-hidden select-none">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-1 py-1.5 text-[10px] font-semibold transition-colors ${
              value === opt.value
                ? "bg-secondary text-foreground"
                : "bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer">
      <span className="text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-[9px] font-mono text-muted-foreground uppercase">
          {value}
        </span>
        <input
          type="color"
          value={value.slice(0, 7)}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-7 rounded border border-border bg-background cursor-pointer p-0.5"
        />
      </span>
    </label>
  );
}

export default function CSVEditorPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [style, setStyle] = useState<TableStyle>(DEFAULT_STYLE);
  const [past, setPast] = useState<TableData[]>([]);
  const [future, setFuture] = useState<TableData[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [openColMenu, setOpenColMenu] = useState<number | null>(null);
  const [styleOpen, setStyleOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [replaceWith, setReplaceWith] = useState("");
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set());
  const [bulkFillOpen, setBulkFillOpen] = useState(false);
  const [bulkFillValue, setBulkFillValue] = useState("");
  const editSnapshot = useRef<TableData | null>(null);
  const lastSelectedRow = useRef<number | null>(null);
  const lastSelectedCol = useRef<number | null>(null);

  /* ---------- search / sort / replace actions ---------- */
  const filteredIdx = useMemo(() => {
    if (!table) return [] as number[];
    return filterRowIndices(table, query.trim(), matchCase);
  }, [table, query, matchCase]);

  /** Filtered indices in sorted order (or natural order). */
  const orderIdx = useMemo(() => {
    if (!table) return [] as number[];
    if (sortState && sortState.col < table.headers.length) {
      const sorted = sortedRowIndices(table, sortState.col, sortState.dir);
      const rank = new Map(sorted.map((r, i) => [r, i]));
      return filteredIdx.slice().sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    }
    return filteredIdx;
  }, [table, filteredIdx, sortState]);

  const totalPages = table ? Math.max(1, Math.ceil(orderIdx.length / PER_PAGE)) : 1;
  const safePage = Math.min(page, totalPages);
  const rowStart = (safePage - 1) * PER_PAGE;

  const visibleRows = useMemo(() => {
    if (!table) return [] as { idx: number; cells: string[] }[];
    return orderIdx
      .slice(rowStart, rowStart + PER_PAGE)
      .map((idx) => ({ idx, cells: table.rows[idx] ?? [] }));
  }, [table, orderIdx, rowStart]);

  const matchCount = useMemo(() => {
    if (!table || query.trim() === "") return 0;
    return countMatches(table, query.trim(), matchCase);
  }, [table, query, matchCase]);

  const isFiltering = query.trim() !== "";

  const flashToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  /* ---------- search / sort / replace actions ---------- */

  useEffect(() => {
    setPage(1);
  }, [query, matchCase, sortState]);

  const toggleSort = useCallback((col: number) => {
    setSortState((s) => {
      if (!s || s.col !== col) return { col, dir: "asc" };
      if (s.dir === "asc") return { col, dir: "desc" };
      return null; // third click clears sorting
    });
  }, []);

  /* ---------- row / column selection ---------- */

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
    setSelectedCols(new Set());
  }, []);

  useEffect(() => {
    clearSelection();
  }, [table?.headers.length, table?.rows.length, clearSelection]);

  const toggleRowSelection = useCallback(
    (idx: number, range = false) => {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (range && lastSelectedRow.current !== null && table) {
          const start = lastSelectedRow.current;
          const [min, max] = [Math.min(start, idx), Math.max(start, idx)];
          for (let i = min; i <= max; i++) {
            next.add(i);
          }
        } else if (next.has(idx)) {
          next.delete(idx);
        } else {
          next.add(idx);
        }
        lastSelectedRow.current = idx;
        return next;
      });
    },
    [table]
  );

  const toggleColSelection = useCallback((idx: number, range = false) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (range && lastSelectedCol.current !== null) {
        const start = lastSelectedCol.current;
        const [min, max] = [Math.min(start, idx), Math.max(start, idx)];
        for (let i = min; i <= max; i++) {
          next.add(i);
        }
      } else if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      lastSelectedCol.current = idx;
      return next;
    });
  }, []);

  const hasSelection = selectedRows.size > 0 || selectedCols.size > 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        hasSelection &&
        !e.defaultPrevented &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName ?? "")
      ) {
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasSelection, clearSelection]);

  const copyAs = useCallback(
    async (format: CopyFormat) => {
      if (!table) return;
      let text: string;
      if (format === "csv") text = tableToCsv(table);
      else if (format === "tsv") text = tableToTsv(table);
      else if (format === "markdown") text = tableToMarkdown(table);
      else
        text = JSON.stringify(
          table.rows.map((row) =>
            Object.fromEntries(row.map((cell, c) => [table.headers[c], cell]))
          ),
          null,
          2
        );
      try {
        await navigator.clipboard.writeText(text);
        flashToast(`Copied as ${format === "markdown" ? "Markdown" : format.toUpperCase()} to clipboard`);
      } catch {
        setError("Clipboard access was blocked by the browser");
      }
      setCopyMenuOpen(false);
    },
    [table, flashToast]
  );

  const startFresh = useCallback(() => {
    setTable(null);
    setFileName(null);
    setPast([]);
    setFuture([]);
    setQuery("");
    setReplaceWith("");
    setSortState(null);
    setPage(1);
  }, []);

  /** Push a structural change onto the undo stack. */
  const commit = useCallback(
    (next: TableData) => {
      if (!table) return;
      setPast((p) => [...p, table].slice(-HISTORY_LIMIT));
      setFuture([]);
      setTable(next);
    },
    [table]
  );

  const applyBulkFill = useCallback(
    (value: string) => {
      if (!table) return;
      if (selectedRows.size > 0) {
        commit(fillRows(table, Array.from(selectedRows), value));
      }
      if (selectedCols.size > 0) {
        commit(fillColumns(table, Array.from(selectedCols), value));
      }
      setBulkFillValue("");
      setBulkFillOpen(false);
      clearSelection();
      flashToast("Filled selected cells");
    },
    [table, selectedRows, selectedCols, commit, clearSelection, flashToast]
  );

  const doReplaceAll = useCallback(() => {
    if (!table || query.trim() === "") return;
    const { table: next, count } = replaceEverywhere(
      table,
      query,
      replaceWith,
      matchCase
    );
    if (count === 0) {
      flashToast("No matches found to replace");
      return;
    }
    commit(next);
    flashToast(`Replaced ${count} ${count === 1 ? "match" : "matches"}`);
  }, [table, query, replaceWith, matchCase, commit, flashToast]);

  const undo = useCallback(() => {
    if (!table || past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, table]);
    setTable(prev);
  }, [table, past]);

  const redo = useCallback(() => {
    if (!table || future.length === 0) return;
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, table]);
    setTable(next);
  }, [table, future]);

  const handleFileLoaded = useCallback(
    (content: string, name: string) => {
      try {
        const parsed = parseCsvTable(content);
        setError(null);
        setFileName(name);
        setPast([]);
        setFuture([]);
        setPage(1);
        setQuery("");
        setReplaceWith("");
        setSortState(null);
        setTable(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not parse the CSV file");
      }
    },
    []
  );

  const startBlank = useCallback(() => {
    setError(null);
    setFileName("untitled.csv");
    setPast([]);
    setFuture([]);
    setPage(1);
    setQuery("");
    setSortState(null);
    setTable(createEmptyTable());
  }, []);

  /* ---------- cell editing with coalesced history ---------- */

  const onCellFocus = useCallback(() => {
    editSnapshot.current = table;
  }, [table]);

  const onCellChange = useCallback(
    (r: number, c: number, value: string) => {
      if (!table) return;
      setTable(setCell(table, r, c, value));
    },
    [table]
  );

  const onCellBlur = useCallback(
    (r: number, c: number) => {
      if (!table) return;
      const snapshot = editSnapshot.current;
      editSnapshot.current = null;
      const currentCell = table.rows[r]?.[c];
      const previousCell = snapshot?.rows[r]?.[c];
      if (!snapshot || currentCell === previousCell) return;
      setPast((p) => [...p.slice(-HISTORY_LIMIT + 1), snapshot]);
      setFuture([]);
    },
    [table]
  );

  const onHeaderFocus = useCallback(() => {
    editSnapshot.current = table;
  }, [table]);

  const onHeaderChange = useCallback(
    (c: number, value: string) => {
      if (!table) return;
      setTable(setHeaderCell(table, c, value));
    },
    [table]
  );

  const onHeaderBlur = useCallback(
    (c: number) => {
      if (!table) return;
      const snapshot = editSnapshot.current;
      editSnapshot.current = null;
      if (!snapshot || table.headers[c] === snapshot.headers[c]) return;
      setPast((p) => [...p.slice(-HISTORY_LIMIT + 1), snapshot]);
      setFuture([]);
    },
    [table]
  );

  /* ---------- keyboard navigation ---------- */

  const focusCell = useCallback((r: number, c: number) => {
    const el = document.querySelector<HTMLInputElement>(
      `input[data-cell="${r}:${c}"]`
    );
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const onCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
      if (!table) return;
      const maxR = table.rows.length - 1;
      const maxC = table.headers.length - 1;
      if (e.key === "Enter" || e.key === "ArrowDown") {
        if (e.key === "ArrowDown" && (e.altKey || e.metaKey || e.ctrlKey)) return;
        e.preventDefault();
        focusCell(Math.min(r + 1, maxR), c);
      } else if (e.key === "ArrowUp") {
        if (e.altKey || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        focusCell(Math.max(r - 1, 0), c);
      } else if (e.key === "Tab") {
        e.preventDefault();
        const nextC = e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, maxC);
        focusCell(r, nextC);
      }
    },
    [table, focusCell]
  );

  /* ---------- exports ---------- */

  const downloadBlob = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, []);

  const runExport = useCallback(
    async (kind: ExportKind) => {
      if (!table || busy) return;
      setBusy(kind);
      setError(null);
      try {
        const base = fileBaseName(fileName);

        if (kind === "csv") {
          const blob = new Blob(["\uFEFF" + tableToCsv(table)], {
            type: "text/csv;charset=utf-8",
          });
          downloadBlob(blob, `${base}.csv`);
          flashToast(`Exported ${base}.csv`);
          return;
        }

        if (kind === "xlsx") {
          const XLSX = await import("xlsx");
          const ws = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
          XLSX.writeFile(wb, `${base}.xlsx`);
          flashToast(`Exported ${base}.xlsx`);
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Export to ${kind.toUpperCase()} failed`);
      } finally {
        setBusy(null);
      }
    },
    [table, busy, fileName, downloadBlob, flashToast]
  );

  /* ---------- style helpers ---------- */

  const patchStyle = useCallback((patch: Partial<TableStyle>) => {
    setStyle((s) => ({ ...s, ...patch }));
  }, []);

  const activePreset = useMemo(() => {
    return STYLE_PRESETS.find(
      (preset) =>
        JSON.stringify(applyPreset(preset)) === JSON.stringify(style)
    );
  }, [style]);

  /* ---------- preview style values ---------- */

  const pad = densityPadding(style.density);
  const stripeBg = (r: number) =>
    style.stripeEnabled && r % 2 === 1 ? style.stripeColor : style.tableBg;

  const cellBorderStyle =
    style.borders === "grid"
      ? `1px solid ${style.borderColor}`
      : style.borders === "horizontal"
      ? `1px solid ${style.borderColor}`
      : "0";

  return (
    <ToolPageLayout title="CSV Editor" description="">
      <div className="h-full flex flex-col gap-4">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <TableIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-bold text-foreground truncate max-w-[180px]">
              {fileName ?? "No file"}
            </span>
            {table && (
              <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                {table.rows.length} rows × {table.headers.length} cols
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline" size="sm" disabled={!table || past.length === 0}
              onClick={undo} aria-label="Undo" title="Undo"
              className="h-7 w-7 p-0 rounded font-semibold shadow-none"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="sm" disabled={!table || future.length === 0}
              onClick={redo} aria-label="Redo" title="Redo"
              className="h-7 w-7 p-0 rounded font-semibold shadow-none"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <span className="w-px h-5 bg-border mx-1" />
            <Button
              variant="outline" size="sm" disabled={!table}
              onClick={() => commit(appendRow(table!))}
              className="h-7 gap-1 rounded font-semibold shadow-none"
            >
              <Plus className="h-3 w-3" /> Row
            </Button>
            <Button
              variant="outline" size="sm" disabled={!table}
              onClick={() => commit(insertColumn(table!, table!.headers.length))}
              className="h-7 gap-1 rounded font-semibold shadow-none"
            >
              <Plus className="h-3 w-3" /> Column
            </Button>
            <span className="w-px h-5 bg-border mx-1" />

            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
              Export
            </span>
            {([
              ["csv", "CSV", <Download key="d" className="h-3 w-3" />],
              ["xlsx", "Excel", <FileSpreadsheet key="e" className="h-3 w-3" />],
            ] as [ExportKind, string, React.ReactNode][]).map(([kind, label, icon]) => (
              <Button
                key={kind}
                variant="outline" size="sm"
                disabled={!table || busy !== null}
                onClick={() => runExport(kind)}
                className="h-7 gap-1 rounded font-semibold shadow-none"
              >
                {icon}
                <span>{busy === kind ? "..." : label}</span>
              </Button>
            ))}
            <span className="w-px h-5 bg-border mx-1" />

            {/* Copy to clipboard */}
            <div className="relative">
              <Button
                variant="outline" size="sm" disabled={!table}
                onClick={() => setCopyMenuOpen((o) => !o)}
                aria-label="Copy table" title="Copy to clipboard"
                className="h-7 gap-1 rounded font-semibold shadow-none"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <ChevronDown className={`h-3 w-3 transition-transform ${copyMenuOpen ? "rotate-180" : ""}`} />
              </Button>
              {copyMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setCopyMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-44 bg-card border border-border rounded shadow-md py-1 text-xs">
                    {([
                      ["csv", "Copy as CSV", <FileText key="c" className="h-3.5 w-3.5" />],
                      ["tsv", "Copy as TSV (Excel)", <TableIcon key="t" className="h-3.5 w-3.5" />],
                      ["markdown", "Copy as Markdown", <FileText key="m" className="h-3.5 w-3.5" />],
                      ["json", "Copy as JSON", <Braces key="j" className="h-3.5 w-3.5" />],
                    ] as [CopyFormat, string, React.ReactNode][]).map(([fmt, label, icon]) => (
                      <button
                        key={fmt}
                        onClick={() => copyAs(fmt)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-foreground hover:bg-secondary/50 transition-colors"
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <span className="w-px h-5 bg-border mx-1 hidden sm:block" />

            <Button
              variant="outline" size="sm" disabled={!table}
              onClick={startFresh}
              aria-label="Close file" title="Close and start over"
              className="h-7 gap-1 rounded font-semibold shadow-none"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden md:inline">New</span>
            </Button>

            <Button
              variant={styleOpen ? "secondary" : "outline"} size="sm"
              onClick={() => setStyleOpen((o) => !o)}
              aria-label="Toggle styling panel" title="Styling panel"
              className="h-7 gap-1 rounded font-semibold shadow-none"
            >
              <Palette className="h-3.5 w-3.5" />
              <ChevronDown className={`h-3 w-3 transition-transform ${styleOpen ? "" : "-rotate-90"}`} />
            </Button>
          </div>
        </div>

        {/* Find & replace bar */}
        {table && (
          <div className="shrink-0 flex flex-wrap items-center gap-2 border border-border bg-card rounded px-3 py-2 text-xs select-none">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in all cells…"
              className="w-44 min-w-[120px] flex-1 sm:flex-none border border-border rounded bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-foreground"
            />
            {query.trim() !== "" && (
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  filteredIdx.length === 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {matchCount} {matchCount === 1 ? "match" : "matches"} · {filteredIdx.length} {filteredIdx.length === 1 ? "row" : "rows"}
              </span>
            )}
            <button
              onClick={() => setMatchCase((m) => !m)}
              aria-label="Match case" title="Match case"
              className={`h-6 px-1.5 rounded border font-mono text-[10px] transition-colors ${
                matchCase
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Aa
            </button>
            {isFiltering && (
              <button
                onClick={() => {
                  setQuery("");
                  setReplaceWith("");
                }}
                aria-label="Clear search"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            <span className="w-px h-4 bg-border mx-0.5 hidden sm:block" />

            <input
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder="Replace with…"
              disabled={!isFiltering}
              className="w-40 min-w-[110px] flex-1 sm:flex-none border border-border rounded bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-foreground disabled:opacity-40"
            />
            <Button
              variant="outline" size="sm" disabled={!isFiltering}
              onClick={doReplaceAll}
              className="h-6 gap-1 px-2 rounded font-semibold shadow-none"
            >
              Replace all
            </Button>
          </div>
        )}

        {/* Bulk selection toolbar */}
        {table && hasSelection && (
          <div className="shrink-0 flex flex-wrap items-center gap-2 border border-border bg-card rounded px-3 py-2 text-xs select-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Bulk
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-secondary rounded">
              {selectedRows.size} row{selectedRows.size !== 1 ? "s" : ""}
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-secondary rounded">
              {selectedCols.size} col{selectedCols.size !== 1 ? "s" : ""}
            </span>

            <span className="w-px h-4 bg-border mx-0.5" />

            <Button
              variant="outline" size="sm"
              disabled={selectedRows.size === 0}
              onClick={() => {
                commit(deleteRows(table, Array.from(selectedRows)));
                clearSelection();
                flashToast(`Deleted ${selectedRows.size} row${selectedRows.size === 1 ? "" : "s"}`);
              }}
              className="h-6 gap-1 px-2 rounded font-semibold shadow-none"
            >
              <Trash2 className="h-3 w-3" /> Delete rows
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={selectedCols.size === 0}
              onClick={() => {
                commit(deleteColumns(table, Array.from(selectedCols)));
                clearSelection();
                flashToast(`Deleted ${selectedCols.size} column${selectedCols.size === 1 ? "" : "s"}`);
              }}
              className="h-6 gap-1 px-2 rounded font-semibold shadow-none"
            >
              <Trash2 className="h-3 w-3" /> Delete cols
            </Button>

            <span className="w-px h-4 bg-border mx-0.5" />

            <Button
              variant="outline" size="sm"
              disabled={selectedRows.size === 0}
              onClick={() => {
                commit(clearRows(table, Array.from(selectedRows)));
                clearSelection();
                flashToast("Cleared selected rows");
              }}
              className="h-6 gap-1 px-2 rounded font-semibold shadow-none"
            >
              <Eraser className="h-3 w-3" /> Clear rows
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={selectedCols.size === 0}
              onClick={() => {
                commit(clearColumns(table, Array.from(selectedCols)));
                clearSelection();
                flashToast("Cleared selected columns");
              }}
              className="h-6 gap-1 px-2 rounded font-semibold shadow-none"
            >
              <Eraser className="h-3 w-3" /> Clear cols
            </Button>

            <Button
              variant="outline" size="sm"
              disabled={selectedRows.size === 0 && selectedCols.size === 0}
              onClick={() => setBulkFillOpen(true)}
              className="h-6 gap-1 px-2 rounded font-semibold shadow-none"
            >
              <Paintbrush className="h-3 w-3" /> Fill…
            </Button>

            <Button
              variant="outline" size="sm"
              disabled={selectedRows.size === 0}
              onClick={() => {
                commit(duplicateRows(table, Array.from(selectedRows)));
                clearSelection();
                flashToast(`Duplicated ${selectedRows.size} row${selectedRows.size === 1 ? "" : "s"}`);
              }}
              className="h-6 gap-1 px-2 rounded font-semibold shadow-none"
            >
              <Copy className="h-3 w-3" /> Duplicate rows
            </Button>

            <span className="w-px h-4 bg-border mx-0.5" />

            <Button
              variant="outline" size="sm"
              disabled={selectedRows.size === 0}
              onClick={() => {
                const indices = Array.from(selectedRows).sort((a, b) => a - b);
                const min = indices[0];
                commit(moveRowsTo(table, indices, Math.max(0, min - 1)));
              }}
              className="h-6 w-6 p-0 rounded font-semibold shadow-none"
              aria-label="Move selected rows up"
              title="Move selected rows up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={selectedRows.size === 0}
              onClick={() => {
                const indices = Array.from(selectedRows).sort((a, b) => a - b);
                const min = indices[0];
                commit(moveRowsTo(table, indices, min + 1));
              }}
              className="h-6 w-6 p-0 rounded font-semibold shadow-none"
              aria-label="Move selected rows down"
              title="Move selected rows down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={selectedCols.size === 0}
              onClick={() => {
                const indices = Array.from(selectedCols).sort((a, b) => a - b);
                const min = indices[0];
                commit(moveColumnsTo(table, indices, Math.max(0, min - 1)));
              }}
              className="h-6 w-6 p-0 rounded font-semibold shadow-none"
              aria-label="Move selected columns left"
              title="Move selected columns left"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={selectedCols.size === 0}
              onClick={() => {
                const indices = Array.from(selectedCols).sort((a, b) => a - b);
                const min = indices[0];
                commit(moveColumnsTo(table, indices, min + 1));
              }}
              className="h-6 w-6 p-0 rounded font-semibold shadow-none"
              aria-label="Move selected columns right"
              title="Move selected columns right"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            <span className="w-px h-4 bg-border mx-0.5" />

            <Button
              variant="ghost" size="sm"
              onClick={clearSelection}
              className="h-6 gap-1 px-2 rounded font-semibold"
            >
              <X className="h-3 w-3" /> Clear selection
            </Button>
          </div>
        )}

        {/* Bulk fill modal */}
        {bulkFillOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/80" onClick={() => setBulkFillOpen(false)} />
            <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded p-4 shadow-lg space-y-4">
              <h3 className="text-sm font-bold">Fill selected cells</h3>
              <input
                autoFocus
                value={bulkFillValue}
                onChange={(e) => setBulkFillValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applyBulkFill(bulkFillValue);
                  } else if (e.key === "Escape") {
                    setBulkFillOpen(false);
                  }
                }}
                placeholder="Value to fill…"
                className="w-full border border-border rounded bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setBulkFillOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={() => applyBulkFill(bulkFillValue)}>Fill</Button>
              </div>
            </div>
          </div>
        )}

        {/* Main region */}
        {!table ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 py-8">
            <FileUpload
              accept=".csv"
              onFileLoaded={handleFileLoaded}
              maxSizeMB={15}
              label="Drag and drop your CSV file here, or click to browse"
              className="w-full max-w-xl"
            />
            <div className="flex items-center gap-3 text-xs text-muted-foreground select-none">
              <span>No file handy?</span>
              <Button
                variant="outline" size="sm" onClick={startBlank}
                className="gap-1.5 rounded font-semibold shadow-none"
              >
                <FilePlus className="h-3.5 w-3.5" />
                Start with an empty table
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">

            {/* Grid */}
            <div className="flex-1 min-h-0 min-w-0 flex flex-col border border-border rounded bg-card overflow-hidden">
              <div className="flex-1 min-h-0 overflow-auto">
                <table
                  className="border-collapse w-full"
                  style={{ fontFamily: style.fontFamily, fontSize: style.fontSize }}
                >
                  <thead>
                    <tr>
                      <th
                        className="sticky top-0 z-20 text-[10px] font-bold text-muted-foreground bg-muted/70 border-b border-r border-border text-center w-14 p-0"
                      >
                        <label className="flex items-center justify-center h-full w-full cursor-pointer">
                          <input
                            type="checkbox"
                            checked={table.rows.length > 0 && orderIdx.every((idx) => selectedRows.has(idx))}
                            onChange={() => {
                              if (orderIdx.every((idx) => selectedRows.has(idx))) {
                                setSelectedRows(new Set());
                              } else {
                                setSelectedRows(new Set(orderIdx));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary/15"
                          />
                        </label>
                      </th>
                      {table.headers.map((header, c) => (
                        <th
                          key={c}
                          className={`sticky top-0 z-20 border-b border-r border-border p-0 text-left align-bottom ${
                            selectedCols.has(c) ? "ring-2 ring-inset ring-primary/40" : ""
                          }`}
                          style={{
                            background: style.headerBg,
                            borderBottom: `2px solid ${style.borderColor}`,
                          }}
                        >
                          <div className="relative flex items-stretch group/h">
                            <label className="flex items-center justify-center px-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedCols.has(c)}
                                onClick={(e) => {
                                  toggleColSelection(c, e.shiftKey);
                                }}
                                onChange={() => {}}
                                className="rounded border-border text-primary focus:ring-primary/15"
                              />
                            </label>
                            {sortState?.col === c && (
                              <span
                                className="flex items-center pl-1.5 shrink-0 text-primary"
                                title={`Sorted ${sortState.dir === "asc" ? "ascending" : "descending"}`}
                              >
                                {sortState.dir === "asc"
                                  ? <ArrowUp className="h-3 w-3" />
                                  : <ArrowDown className="h-3 w-3" />}
                              </span>
                            )}
                            <input
                              value={header}
                              onFocus={onHeaderFocus}
                              onBlur={() => onHeaderBlur(c)}
                              onChange={(e) => onHeaderChange(c, e.target.value)}
                              className="flex-1 min-w-0 bg-transparent outline-none px-3 py-2 font-bold"
                              style={{ color: style.headerColor, fontSize: style.fontSize }}
                            />
                            <button
                              onClick={() =>
                                setOpenColMenu(openColMenu === c ? null : c)
                              }
                              aria-label={`Column options for ${header}`}
                              className="px-1.5 opacity-40 hover:opacity-100 transition-opacity"
                              style={{ color: style.headerColor }}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>

                            {openColMenu === c && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setOpenColMenu(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-40 w-44 bg-card border border-border rounded shadow-md py-1 text-xs normal-case font-medium">
                                  {[
                                    {
                                      label:
                                        sortState?.col === c && sortState.dir === "asc"
                                          ? "Sorted A → Z"
                                          : "Sort ascending",
                                      icon: ArrowUp,
                                      action: () => (toggleSort(c), table),
                                      noCommit: true,
                                      active: sortState?.col === c && sortState.dir === "asc",
                                    },
                                    {
                                      label:
                                        sortState?.col === c && sortState.dir === "desc"
                                          ? "Sorted Z → A"
                                          : "Sort descending",
                                      icon: ArrowDown,
                                      action: () => (toggleSort(c), table),
                                      noCommit: true,
                                      active: sortState?.col === c && sortState.dir === "desc",
                                    },
                                    { divider: true },
                                    {
                                      label: "Insert left",
                                      action: () => insertColumn(table, c),
                                      icon: ArrowLeft,
                                    },
                                    {
                                      label: "Insert right",
                                      action: () => insertColumn(table, c + 1),
                                      icon: ArrowRight,
                                    },
                                    {
                                      label: "Move left",
                                      action: () => moveColumn(table, c, c - 1),
                                      icon: ArrowLeft,
                                      disabled: c === 0,
                                    },
                                    {
                                      label: "Move right",
                                      action: () => moveColumn(table, c, c + 1),
                                      icon: ArrowRight,
                                      disabled: c === table.headers.length - 1,
                                    },
                                    {
                                      label: "Delete column",
                                      action: () => deleteColumn(table, c),
                                      icon: Trash2,
                                      danger: true,
                                    },
                                  ].map((item, i) =>
                                    "divider" in item ? (
                                      <div key={`div-${i}`} className="my-1 h-px bg-border" />
                                    ) : (
                                    <button
                                      key={item.label}
                                      disabled={"disabled" in item && item.disabled}
                                      onClick={() => {
                                        if (item.noCommit) {
                                          item.action();
                                          setOpenColMenu(null);
                                        } else {
                                          commit(item.action());
                                          setOpenColMenu(null);
                                        }
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                                        ("disabled" in item && item.disabled)
                                          ? "opacity-30 cursor-not-allowed"
                                          : item.danger
                                          ? "text-destructive hover:bg-destructive/10"
                                          : item.active
                                            ? "text-primary bg-primary/5 font-semibold"
                                            : "text-foreground hover:bg-secondary/50"
                                      }`}
                                    >
                                      <item.icon className="h-3.5 w-3.5" />
                                      {item.label}
                                    </button>
                                    )
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 && (
                      <tr>
                        <td colSpan={table.headers.length + 1}>
                          <div className="flex flex-col items-center gap-2 py-10 text-xs text-muted-foreground select-none">
                            {isFiltering
                              ? "No rows match your search"
                              : "No rows yet"}
                            {isFiltering ? (
                              <Button
                                variant="outline" size="sm"
                                onClick={() => setQuery("")}
                                className="rounded font-semibold shadow-none"
                              >
                                <X className="h-3 w-3" /> Clear search
                              </Button>
                            ) : (
                              <Button
                                variant="outline" size="sm"
                                onClick={() => commit(appendRow(table))}
                                className="rounded font-semibold shadow-none"
                              >
                                <Plus className="h-3 w-3" /> Add first row
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {visibleRows.map(({ idx, cells }) => (
                      <tr
                        key={idx}
                        className={`group/r ${
                          selectedRows.has(idx) ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className={`relative border-b border-r border-border bg-muted/30 text-left w-24 p-0 ${
                          selectedRows.has(idx) ? "bg-primary/5" : ""
                        }`}>
                          <div className="flex items-center justify-between h-full px-1.5">
                            <label className="flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                title={`Row ${idx + 1}`}
                                checked={selectedRows.has(idx)}
                                onClick={(e) => toggleRowSelection(idx, e.shiftKey)}
                                onChange={() => {}}
                                className="rounded border-border text-primary focus:ring-primary/15"
                              />
                            </label>
                            <span className="block text-[10px] font-mono text-muted-foreground group-hover/r:hidden select-none">
                              {idx + 1}
                            </span>
                            <span className="hidden group-hover/r:flex items-center justify-center gap-0.5">
                            {[
                              {
                                icon: ChevronUp, label: "Move row up",
                                act: () => moveRow(table, idx, idx - 1),
                                disabled: idx === 0,
                              },
                              {
                                icon: ChevronDown, label: "Move row down",
                                act: () => moveRow(table, idx, idx + 1),
                                disabled: idx === table.rows.length - 1,
                              },
                              {
                                icon: Copy, label: "Duplicate row",
                                act: () => duplicateRow(table, idx),
                              },
                              {
                                icon: Trash2, label: "Delete row",
                                act: () => deleteRow(table, idx), danger: true,
                              },
                            ].map(({ icon: RowIcon, label, act, ...rest }) => (
                              <button
                                key={label}
                                {...rest}
                                aria-label={label}
                                title={label}
                                onClick={() => commit(act())}
                                className={`p-0.5 rounded transition-colors ${
                                  "disabled" in rest && rest.disabled
                                    ? "opacity-25 cursor-not-allowed text-muted-foreground"
                                    : rest.danger
                                    ? "text-destructive hover:bg-destructive/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                }`}
                              >
                                <RowIcon className="h-3 w-3" />
                              </button>
                            ))}
                            </span>
                          </div>
                        </td>
                        {cells.map((cell, c) => (
                          <td
                            key={c}
                            className={`border-r border-b-0 p-0 align-top ${
                              selectedCols.has(c)
                                ? "ring-2 ring-inset ring-primary/30 bg-primary/[4%]"
                                : ""
                            }`}
                            style={{
                              background:
                                selectedRows.has(idx) || selectedCols.has(c)
                                  ? undefined
                                  : stripeBg(idx),
                              borderBottom:
                                cellBorderStyle === "0"
                                  ? undefined
                                  : `1px solid ${style.borderColor}`,
                            }}
                          >
                            <input
                              data-cell={`${idx}:${c}`}
                              value={cell}
                              onFocus={onCellFocus}
                              onBlur={() => onCellBlur(idx, c)}
                              onChange={(e) => onCellChange(idx, c, e.target.value)}
                              onKeyDown={(e) => onCellKeyDown(e, idx, c)}
                              className="w-full h-full min-w-[90px] bg-transparent outline-none focus:ring-2 focus:ring-primary/30 focus:bg-primary/5 rounded-sm px-3"
                              style={{
                                color: style.bodyColor,
                                padding: pad,
                                textAlign: style.align,
                                fontSize: style.fontSize,
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pager */}
              <div className="shrink-0 flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground select-none">
                <span>
                  {table.rows.length === 0
                    ? "Empty sheet"
                    : isFiltering
                    ? `Rows ${rowStart + 1}–${Math.min(rowStart + PER_PAGE, orderIdx.length)} of ${orderIdx.length} (filtered from ${table.rows.length})`
                    : `Rows ${rowStart + 1}–${Math.min(rowStart + PER_PAGE, table.rows.length)} of ${table.rows.length}`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    className="h-6 px-2 rounded font-semibold shadow-none"
                  >
                    Prev
                  </Button>
                  <span className="font-mono">Page {safePage} / {totalPages}</span>
                  <Button
                    variant="outline" size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                    className="h-6 px-2 rounded font-semibold shadow-none"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {/* Style sidebar */}
            {styleOpen && (
              <aside className="w-full lg:w-72 shrink-0 border border-border bg-card rounded overflow-y-auto text-xs">
                <div className="space-y-5 p-4">

                  {/* Presets */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Presets
                      </p>
                      <button
                        onClick={() => setStyle(DEFAULT_STYLE)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {STYLE_PRESETS.map((preset: StylePreset) => (
                        <button
                          key={preset.name}
                          onClick={() => setStyle(applyPreset(preset))}
                          className={`border rounded px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                            activePreset?.name === preset.name
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Font */}
                  <section className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Font
                    </p>
                    <select
                      value={style.fontFamily}
                      onChange={(e) => patchStyle({ fontFamily: e.target.value })}
                      className="w-full border border-border rounded bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.label} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                        <span>Size</span>
                        <span className="font-mono">{style.fontSize}px</span>
                      </div>
                      <input
                        type="range" min={10} max={22} step={1}
                        value={style.fontSize}
                        onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })}
                        className="w-full accent-current cursor-pointer"
                      />
                    </div>
                  </section>

                  {/* Colors */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Colors
                      </p>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={style.stripeEnabled}
                          onChange={(e) => patchStyle({ stripeEnabled: e.target.checked })}
                          className="rounded border-border text-primary focus:ring-primary/15"
                        />
                        <span className="text-[10px] font-semibold text-muted-foreground">Zebra rows</span>
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <ColorField label="Header background" value={style.headerBg}
                        onChange={(v) => patchStyle({ headerBg: v })} />
                      <ColorField label="Header text" value={style.headerColor}
                        onChange={(v) => patchStyle({ headerColor: v })} />
                      <ColorField label="Body text" value={style.bodyColor}
                        onChange={(v) => patchStyle({ bodyColor: v })} />
                      <ColorField label="Sheet background" value={style.tableBg}
                        onChange={(v) => patchStyle({ tableBg: v })} />
                      {style.stripeEnabled && (
                        <ColorField label="Stripe color" value={style.stripeColor}
                          onChange={(v) => patchStyle({ stripeColor: v })} />
                      )}
                      {style.borders !== "none" && (
                        <ColorField label="Border color" value={style.borderColor}
                          onChange={(v) => patchStyle({ borderColor: v })} />
                      )}
                    </div>
                  </section>

                  {/* Layout */}
                  <section className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Layout
                    </p>
                    <Segmented<Density>
                      label="Density"
                      value={style.density}
                      options={[
                        { value: "compact", label: "Compact" },
                        { value: "normal", label: "Normal" },
                        { value: "roomy", label: "Roomy" },
                      ]}
                      onChange={(v) => patchStyle({ density: v })}
                    />
                    <Segmented<AlignMode>
                      label="Alignment"
                      value={style.align}
                      options={[
                        { value: "left", label: "Left" },
                        { value: "center", label: "Center" },
                        { value: "right", label: "Right" },
                      ]}
                      onChange={(v) => patchStyle({ align: v })}
                    />
                    <Segmented<BorderMode>
                      label="Borders"
                      value={style.borders}
                      options={[
                        { value: "none", label: "None" },
                        { value: "horizontal", label: "Lines" },
                        { value: "grid", label: "Grid" },
                      ]}
                      onChange={(v) => patchStyle({ borders: v })}
                    />
                  </section>
                </div>
              </aside>
            )}
          </div>
        )}

        {/* Diagnostics */}
        {error && (
          <StatusMessage type="error">{error}</StatusMessage>
        )}
        {toast && !error && (
          <StatusMessage type="success">{toast}</StatusMessage>
        )}
      </div>
    </ToolPageLayout>
  );
}
