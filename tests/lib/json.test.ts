import assert from "node:assert/strict";
import test from "node:test";
import {
  assignKey,
  beautifyJSON,
  jsToJSON,
  minifyJSON,
  parseJSLiteral,
  sortJSONValue,
  validateJSON,
} from "../../src/lib/json.ts";

test("validateJSON accepts strict JSON and reports the parser error", () => {
  assert.deepEqual(validateJSON('{"a":1}'), { valid: true, parsed: { a: 1 } });
  assert.equal(validateJSON("{a:1}").valid, false);
  assert.match(validateJSON("{a:1}").error ?? "", /Expected property name/);
});

test("beautifyJSON and minifyJSON preserve the JSON value", () => {
  assert.equal(beautifyJSON('{"a":1}', 2), '{\n  "a": 1\n}');
  assert.equal(minifyJSON('{ "a" : 1 }'), '{"a":1}');
});

test("parseJSLiteral accepts object literal syntax without executing it", () => {
  assert.deepEqual(parseJSLiteral('{a:1, "b":2, \'c\':3,}'), { a: 1, b: 2, c: 3 });
  assert.deepEqual(parseJSLiteral("{/*x*/a:1,//y\nb:2}"), { a: 1, b: 2 });
  assert.deepEqual(parseJSLiteral("{a:'it\\'s', b:\"x\\ny\", c:`tpl`}"), {
    a: "it's",
    b: "x\ny",
    c: "tpl",
  });
});

test("parseJSLiteral handles numeric literal forms and current precision limits", () => {
  assert.deepEqual(
    parseJSLiteral("{hex:0xFF, oct:0o10, bin:0b101, big:9007199254740993, inf:Infinity, nan:NaN, negzero:-0}"),
    { hex: 255, oct: 8, bin: 5, big: 9007199254740992, inf: Infinity, nan: NaN, negzero: -0 },
  );
});

test("parseJSLiteral preserves undefined and sparse array slots", () => {
  assert.deepEqual(parseJSLiteral("{a:undefined,b:[undefined,1,,2]}"), {
    a: undefined,
    b: [undefined, 1, undefined, 2],
  });
});

test("parseJSLiteral keeps __proto__ as an own property", () => {
  const parsed = parseJSLiteral("{__proto__:{polluted:true},a:1}") as Record<string, unknown>;

  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, "__proto__"), true);
  assert.deepEqual(parsed.__proto__, { polluted: true });
});

test("parseJSLiteral rejects code that would require execution", () => {
  assert.throws(() => parseJSLiteral("foo()"), /Function calls are not supported/);
  assert.throws(() => parseJSLiteral("const x = 1"), /Variable declarations are not supported/);
  assert.throws(() => parseJSLiteral("a = 1"), /Assignments are not supported/);
  assert.throws(() => parseJSLiteral("{a: `${x}`}"), /Template literal expressions/);
  assert.throws(() => parseJSLiteral("{...a}"), /Spread syntax/);
  assert.throws(() => parseJSLiteral("{[x]:1}"), /Computed property names/);
  assert.throws(() => parseJSLiteral("1 + 2"), /Unexpected content after the top-level value/);
});

test("jsToJSON emits strict JSON from literal syntax", () => {
  assert.equal(jsToJSON("{a:1,b:[2,3]}"), '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
});

test("sortJSONValue sorts object keys deeply", () => {
  assert.equal(
    sortJSONValue({ z: 1, a: { d: 4, b: 2 }, arr: [{ y: 1, x: 2 }] }),
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
