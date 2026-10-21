import assert from "node:assert/strict";
import test from "node:test";
import { csvToJSON, jsonToCSV, parseCSV } from "../../src/lib/csv.ts";

test("parses a simple CSV with string values", () => {
  const result = parseCSV("name,age\nAda,36\nGrace,37\n");

  assert.deepEqual(result, {
    data: [
      { name: "Ada", age: "36" },
      { name: "Grace", age: "37" },
    ],
    headers: ["name", "age"],
    errors: [],
  });
});

test("preserves quoted commas and newlines", () => {
  const result = parseCSV('name,note\nAda,"hello, world"\nGrace,"line1\nline2"\n');

  assert.deepEqual(result.data, [
    { name: "Ada", note: "hello, world" },
    { name: "Grace", note: "line1\nline2" },
  ]);
  assert.deepEqual(result.headers, ["name", "note"]);
});

test("empty input reports the delimiter auto-detect error", () => {
  const result = parseCSV("");

  assert.deepEqual(result.data, []);
  assert.deepEqual(result.headers, []);
  assert.match(result.errors[0]?.message ?? "", /Unable to auto-detect delimiting character/);
});

test("duplicate headers are renamed by Papa", () => {
  const result = parseCSV("a,a\n1,2\n");

  assert.deepEqual(result.data, [{ a: "1", a_1: "2" }]);
  assert.deepEqual(result.headers, ["a", "a_1"]);
});

test("csvToJSON emits the current pretty JSON shape", () => {
  assert.equal(
    csvToJSON("name,age\nAda,36\n"),
    '[\n  {\n    "name": "Ada",\n    "age": "36"\n  }\n]',
  );
});

test("jsonToCSV keeps the current first-record schema behavior", () => {
  assert.equal(jsonToCSV([{ a: 1 }, { a: 2, b: 3 }]), "a\r\n1\r\n2");
});

test("jsonToCSV stringifies nested values and preserves null/boolean cells", () => {
  assert.equal(
    jsonToCSV([
      { a: { x: 1 }, b: [1, 2] },
      { a: null, b: true },
    ]),
    'a,b\r\n"{""x"":1}","[1,2]"\r\n,true',
  );
});

test("jsonToCSV rejects non-arrays and empty arrays", () => {
  assert.throws(() => jsonToCSV({ a: 1 }), /Input must be an array/);
  assert.throws(() => jsonToCSV([]), /Array is empty/);
});

test("jsonToCSV rejects unsupported primitive rows", () => {
  assert.throws(() => jsonToCSV([1, 2, 3]), /Unable to serialize unrecognized input/);
});
