import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import {
  buildPdfCss,
  DEFAULT_PDF_LAYOUT,
  PDF_LAYOUT_LIMITS,
  printPdfDocument,
} from "../src/lib/notes/pdf.ts";

test("PDF layout uses defaults and applies custom spacing and page insets", () => {
  const defaults = buildPdfCss();
  assert.match(defaults, /margin: 16mm/);
  assert.match(defaults, /line-height: 1.6/);
  assert.match(defaults, /margin-bottom: 11pt/);
  const custom = buildPdfCss({
    lineSpacing: 2,
    paragraphSpacing: 18,
    margin: 24,
    padding: 8,
  });
  assert.match(custom, /margin: 32mm/);
  assert.match(custom, /line-height: 2;/);
  assert.match(custom, /margin-bottom: 18pt/);
  assert.match(custom, /max-height: 217mm/);
});

test("PDF layout accepts bounds and rejects invalid values before CSS generation", () => {
  for (const [key, { min, max }] of Object.entries(PDF_LAYOUT_LIMITS)) {
    for (const value of [min, max]) {
      assert.doesNotThrow(() =>
        buildPdfCss({ ...DEFAULT_PDF_LAYOUT, [key]: value }),
      );
    }
    for (const value of [NaN, Infinity, min - 1, max + 1, "0; color:red"]) {
      assert.throws(
        () => buildPdfCss({ ...DEFAULT_PDF_LAYOUT, [key]: value }),
        /must be between/,
      );
    }
  }
});

function installDocument(
  context: TestContext,
  options: {
    fonts?: Promise<void>;
    decode?: () => Promise<void>;
    print?: () => void;
  } = {},
) {
  const attributes = new Map<string, string>();
  const state = { printed: false, removed: false, focused: false };
  const printWindow = Object.assign(new EventTarget(), {
    focus() {},
    print() {
      state.printed = true;
      options.print?.();
    },
  });
  const frame = {
    title: "",
    srcdoc: "",
    tabIndex: 0,
    style: { cssText: "" },
    onload: null as (() => void) | null,
    contentDocument: {
      fonts: { ready: options.fonts ?? Promise.resolve() },
      images: [{ decode: options.decode ?? (() => Promise.resolve()) }],
    },
    contentWindow: printWindow,
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    remove() { state.removed = true; },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => frame,
      activeElement: { focus() { state.focused = true; } },
      body: {
        appendChild() { queueMicrotask(() => frame.onload?.()); },
      },
    },
  });
  context.after(() => {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  });
  return { frame, attributes, state, printWindow };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

test("PDF waits for fonts/images and retains frame until dialog closes", async (t) => {
  const fonts = deferred();
  const image = deferred();
  const { frame, attributes, state, printWindow } = installDocument(t, {
    fonts: fonts.promise,
    decode: () => image.promise,
  });
  const pending = printPdfDocument("<p>Complete note</p>");
  await nextTurn();
  assert.equal(state.printed, false);
  fonts.resolve();
  await nextTurn();
  assert.equal(state.printed, false);
  image.resolve();
  await nextTurn();
  assert.equal(state.printed, true);
  assert.equal(state.removed, false);
  assert.equal(frame.srcdoc, "<p>Complete note</p>");
  assert.equal(attributes.get("sandbox"), "allow-same-origin allow-modals");
  printWindow.dispatchEvent(new Event("afterprint"));
  await pending;
  assert.equal(state.removed, true);
  assert.equal(state.focused, true);
});

test("PDF reports a broken image instead of printing incomplete content", async (t) => {
  const { state } = installDocument(t, {
    decode: async () => { throw new Error("Invalid image"); },
  });
  await assert.rejects(printPdfDocument("note"), /image could not be loaded/);
  assert.equal(state.printed, false);
  assert.equal(state.removed, true);
});

test("PDF cleans up if the browser refuses printing", async (t) => {
  const { state } = installDocument(t, {
    print: () => { throw new Error("Printing unavailable"); },
  });
  await assert.rejects(printPdfDocument("note"), /Printing unavailable/);
  assert.equal(state.removed, true);
});

test("PDF times out and cleans up a stalled image load", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { state } = installDocument(t, {
    decode: () => new Promise(() => {}),
  });
  const rejection = assert.rejects(
    printPdfDocument("note"),
    /PDF preparation timed out/,
  );
  t.mock.timers.tick(30_000);
  await rejection;
  assert.equal(state.printed, false);
  assert.equal(state.removed, true);
});
