import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeSvgElement,
  isUnsafeSvgAttribute,
  svgElementsToSanitize,
} from "../../src/lib/svg-sanitize.ts";

test("allows the documented SVG element allowlist", () => {
  for (const name of ["svg", "g", "path", "rect", "linearGradient", "text"]) {
    assert.equal(isSafeSvgElement(name), true, name);
  }
  for (const name of ["script", "foreignObject", "image", "style", "iframe"]) {
    assert.equal(isSafeSvgElement(name), false, name);
  }
});

test("rejects active attributes and non-local hrefs", () => {
  for (const [name, value] of [
    ["onload", "alert(1)"],
    ["onclick", "alert(1)"],
    ["style", "fill:red"],
    ["src", "https://example.test/x.svg"],
    ["xml:base", "https://example.test/"],
    ["href", "https://example.test/x.svg"],
    ["xlink:href", "javascript:alert(1)"],
    ["fill", "url(https://example.test/p.svg#g)"],
    ["data-x", "data:text/html,<script>alert(1)</script>"],
  ]) {
    assert.equal(isUnsafeSvgAttribute(name, value), true, `${name}=${value}`);
  }
});

test("keeps benign presentation attributes and local references", () => {
  for (const [name, value] of [
    ["viewBox", "0 0 24 24"],
    ["fill", "#ff0000"],
    ["fill", "url(#gradient)"],
    ["href", "#gradient"],
    ["xlink:href", "#clip"],
    ["stroke-width", "2"],
    ["aria-label", "An icon"],
  ]) {
    assert.equal(isUnsafeSvgAttribute(name, value), false, `${name}=${value}`);
  }
});

test("sanitizes descendants children-first and includes the root", () => {
  const first = { localName: "rect" } as unknown as Element;
  const second = { localName: "path" } as unknown as Element;
  const root = {
    localName: "svg",
    querySelectorAll: () => [first, second],
  } as unknown as Element;

  assert.deepEqual(svgElementsToSanitize(root), [second, first, root]);
});
