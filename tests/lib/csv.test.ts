import assert from "node:assert/strict";
import test from "node:test";
import { jsonToCsv, parseCsv } from "../../src/lib/csv.ts";

test("parses a simple CSV with string values", () => {
  const result = parseCsv("name,age\nAda,36\nGrace,37\n");

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
  const result = parseCsv('name,note\nAda,"hello, world"\nGrace,"line1\nline2"\n');

  assert.deepEqual(result.data, [
    { name: "Ada", note: "hello, world" },
    { name: "Grace", note: "line1\nline2" },
  ]);
  assert.deepEqual(result.headers, ["name", "note"]);
});

test("empty input reports the delimiter auto-detect error", () => {
  const result = parseCsv("");

  assert.deepEqual(result.data, []);
  assert.deepEqual(result.headers, []);
  assert.match(result.errors[0]?.message ?? "", /Unable to auto-detect delimiting character/);
});

test("duplicate headers are renamed by Papa", () => {
  const result = parseCsv("a,a\n1,2\n");

  assert.deepEqual(result.data, [{ a: "1", a_1: "2" }]);
  assert.deepEqual(result.headers, ["a", "a_1"]);
});

test("parseCsv honors dynamic typing and an explicit delimiter", () => {
  const typed = parseCsv("a,b\n1,2", { dynamicTyping: true });
  assert.deepEqual(typed.data, [{ a: 1, b: 2 }]);

  const semicolon = parseCsv("a;b\n1;2", { delimiter: ";" });
  assert.deepEqual(semicolon.headers, ["a", "b"]);
});

test("parseCsv failOnError throws with row information", () => {
  assert.throws(
    () => parseCsv('a,b\n"unclosed', { failOnError: true }),
    /Quoted field unterminated \(Row: 2\)/,
  );
});

test("jsonToCsv keeps the current first-record schema behavior", () => {
  assert.equal(jsonToCsv([{ a: 1 }, { a: 2, b: 3 }]), "a\r\n1\r\n2");
});

test("jsonToCsv stringifies nested values and preserves null/boolean cells", () => {
  assert.equal(
    jsonToCsv([
      { a: { x: 1 }, b: [1, 2] },
      { a: null, b: true },
    ]),
    'a,b\r\n"{""x"":1}","[1,2]"\r\n,true',
  );
});

test("jsonToCsv rejects non-arrays and empty arrays", () => {
  assert.throws(() => jsonToCsv({ a: 1 }), /Input must be an array/);
  assert.throws(() => jsonToCsv([]), /Array is empty/);
});

test("jsonToCsv rejects unsupported primitive rows", () => {
  assert.throws(() => jsonToCsv([1, 2, 3]), /Unable to serialize unrecognized input/);
});
