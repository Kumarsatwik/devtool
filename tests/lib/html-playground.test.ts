import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocument,
  CONSOLE_BRIDGE,
  PREVIEW_CSP,
} from "../../src/lib/html-playground.ts";

test("builds a document with the preview CSP and user panes verbatim", () => {
  const doc = buildDocument("<main>hi</main>", "body{color:red}", "console.log(1)", true);

  assert.match(doc, /^<!DOCTYPE html>/);
  assert.ok(doc.includes(`content="${PREVIEW_CSP}"`));
  assert.ok(doc.includes("<main>hi</main>"));
  assert.ok(doc.includes("body{color:red}"));
  assert.ok(doc.includes("console.log(1)"));
  assert.ok(doc.includes(CONSOLE_BRIDGE));
});

test("omits the console bridge for standalone documents", () => {
  const doc = buildDocument("<p>x</p>", "", "", false);

  assert.equal(doc.includes("__htmlPlayground"), false);
});

test("the CSP denies external network capabilities", () => {
  assert.match(PREVIEW_CSP, /default-src 'none'/);
  assert.match(PREVIEW_CSP, /connect-src data: blob:/);
  assert.match(PREVIEW_CSP, /form-action 'none'/);
});
