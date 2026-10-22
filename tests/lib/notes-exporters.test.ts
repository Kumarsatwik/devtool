import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocument,
  buildNoteHeading,
  NOTE_CSP,
  sanitizeFilename,
} from "../../src/lib/notes/html.ts";

test("escapes markup in the document title", () => {
  const doc = buildDocument('A <B> & "C"', "<p>body</p>");

  assert.match(doc, /<title>A &lt;B&gt; &amp; &quot;C&quot;<\/title>/);
  assert.equal(doc.includes("<title>A <B>"), false);
});

test("escapes markup in the note heading", () => {
  assert.equal(
    buildNoteHeading('A <B> & "C"'),
    "<h1>A &lt;B&gt; &amp; &quot;C&quot;</h1>",
  );
});

test("keeps body markup intact", () => {
  const doc = buildDocument("Safe title", "<p>body</p>");

  assert.match(doc, /<p>body<\/p>/);
});

test("note documents carry a restrictive CSP", () => {
  const doc = buildDocument("Safe title", "<p>body</p>");

  assert.ok(doc.includes(`content="${NOTE_CSP}"`));
  assert.match(NOTE_CSP, /default-src 'none'/);
  assert.match(NOTE_CSP, /img-src data: blob:/);
  assert.equal(NOTE_CSP.includes("https:"), false);
});

test("sanitizes filenames without changing safe names", () => {
  assert.equal(sanitizeFilename("My note"), "My note");
  assert.equal(sanitizeFilename('a/b:c*?"<>|'), "a-b-c-");
  assert.equal(sanitizeFilename("   "), "note");
});
