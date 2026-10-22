import assert from "node:assert/strict";
import test from "node:test";
import {
  assignKey,
  beautifyJson,
  jsToJson,
  jsonToJs,
  minifyJson,
  parseJsLiteral,
  sortJsonValue,
  validateJson,
} from "../../src/lib/json.ts";

test("validateJson accepts strict JSON and reports the parser error", () => {
  assert.deepEqual(validateJson('{"a":1}'), { valid: true, parsed: { a: 1 } });
  assert.equal(validateJson("{a:1}").valid, false);
  assert.match(validateJson("{a:1}").error ?? "", /Expected property name/);
});

test("beautifyJson and minifyJson preserve the JSON value", () => {
  assert.equal(beautifyJson('{"a":1}', 2), '{\n  "a": 1\n}');
  assert.equal(minifyJson('{ "a" : 1 }'), '{"a":1}');
});

test("parseJsLiteral accepts object literal syntax without executing it", () => {
  assert.deepEqual(parseJsLiteral('{a:1, "b":2, \'c\':3,}'), { a: 1, b: 2, c: 3 });
  assert.deepEqual(parseJsLiteral("{/*x*/a:1,//y\nb:2}"), { a: 1, b: 2 });
  assert.deepEqual(parseJsLiteral("{a:'it\\'s', b:\"x\\ny\", c:`tpl`}"), {
    a: "it's",
    b: "x\ny",
    c: "tpl",
  });
});

test("parseJsLiteral handles numeric literal forms and current precision limits", () => {
  assert.deepEqual(
    parseJsLiteral("{hex:0xFF, oct:0o10, bin:0b101, big:9007199254740993, inf:Infinity, nan:NaN, negzero:-0}"),
    { hex: 255, oct: 8, bin: 5, big: 9007199254740992, inf: Infinity, nan: NaN, negzero: -0 },
  );
});

test("parseJsLiteral preserves undefined and sparse array slots", () => {
  assert.deepEqual(parseJsLiteral("{a:undefined,b:[undefined,1,,2]}"), {
    a: undefined,
    b: [undefined, 1, undefined, 2],
  });
});

test("parseJsLiteral keeps __proto__ as an own property", () => {
  const parsed = parseJsLiteral("{__proto__:{polluted:true},a:1}") as Record<string, unknown>;

  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, "__proto__"), true);
  assert.deepEqual(parsed.__proto__, { polluted: true });
});

test("parseJsLiteral rejects code that would require execution", () => {
  assert.throws(() => parseJsLiteral("foo()"), /Function calls are not supported/);
  assert.throws(() => parseJsLiteral("const x = 1"), /Variable declarations are not supported/);
  assert.throws(() => parseJsLiteral("a = 1"), /Assignments are not supported/);
  assert.throws(() => parseJsLiteral("{a: `${x}`}"), /Template literal expressions/);
  assert.throws(() => parseJsLiteral("{...a}"), /Spread syntax/);
  assert.throws(() => parseJsLiteral("{[x]:1}"), /Computed property names/);
  assert.throws(() => parseJsLiteral("1 + 2"), /Unexpected content after the top-level value/);
});

test("jsToJson emits strict JSON from literal syntax", () => {
  assert.equal(jsToJson("{a:1,b:[2,3]}"), '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
});

test("sortJsonValue sorts object keys deeply", () => {
  assert.equal(
    sortJsonValue({ z: 1, a: { d: 4, b: 2 }, arr: [{ y: 1, x: 2 }] }),
    '{\n  "a": {\n    "b": 2,\n    "d": 4\n  },\n  "arr": [\n    {\n      "x": 2,\n      "y": 1\n    }\n  ],\n  "z": 1\n}',
  );
});

test("assignKey writes __proto__ as data instead of mutating the prototype", () => {
  const target: Record<string, unknown> = {};
  assignKey(target, "__proto__", { polluted: true });

  assert.equal(Object.getPrototypeOf(target), Object.prototype);
  assert.equal(Object.prototype.hasOwnProperty.call(target, "__proto__"), true);
  assert.deepEqual(target, JSON.parse('{"__proto__":{"polluted":true}}'));
});

test("jsonToJs emits object and array literals", () => {
  assert.equal(
    jsonToJs('{"a":1,"b":"x","c":[1,2,3]}'),
    '{\n  a: 1,\n  b: "x",\n  c: [ 1, 2, 3 ]\n}',
  );
  assert.equal(
    jsonToJs('{"a":[{"x":1},{"y":2}]}'),
    '{\n  a: [\n    {\n      x: 1\n    },\n    {\n      y: 2\n    }\n  ]\n}',
  );
});

test("jsonToJs quotes special keys and honors indentation", () => {
  assert.equal(
    jsonToJs('{"__proto__":{"x":1},"not-a-key":2}', 4),
    '{\n    ["__proto__"]: {\n        x: 1\n    },\n    "not-a-key": 2\n}',
  );
});

test("jsonToJs rejects invalid JSON", () => {
  assert.throws(() => jsonToJs("{bad"), /Expected property name/);
});
