import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

test("uses a supported SheetJS release", () => {
  const [major, minor, patch] = XLSX.version.split(".").map(Number);
  assert.ok(
    major > 0 || minor > 20 || (minor === 20 && patch >= 3),
    `unexpected SheetJS version ${XLSX.version}`,
  );
});

test("round-trips a generated workbook", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["name", "age"],
    ["Ada", 36],
    ["Grace", 37],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "People");

  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const parsed = XLSX.read(bytes, { type: "array" });

  assert.deepEqual(XLSX.utils.sheet_to_json(parsed.Sheets.People), [
    { name: "Ada", age: 36 },
    { name: "Grace", age: 37 },
  ]);
});
