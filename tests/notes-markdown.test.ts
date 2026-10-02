import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeHtml,
  htmlToMarkdown,
  markdownToHtml,
} from "../src/lib/notes/markdown.ts";

test("converts mermaid code fences to diagram pre block", () => {
  const md = "```mermaid\ngraph LR\n  A --> B\n```";
  const html = markdownToHtml(md);
  assert.ok(html.includes('<pre data-type="mermaid"><code>graph LR\n  A --&gt; B</code></pre>'));
});

test("converts horizontal rules to slide breaks (---)", () => {
  const html = "<h1>Slide 1</h1><p>Content</p><hr><h1>Slide 2</h1>";
  const md = htmlToMarkdown(html);
  assert.ok(md.includes("---"));
  assert.ok(md.includes("# Slide 1"));
  assert.ok(md.includes("# Slide 2"));
});

test("preserves highlight markup in markdown round-trip", () => {
  const md = "This is ==important== text";
  const html = markdownToHtml(md);
  assert.ok(html.includes("<mark>important</mark>"));
  const backToMd = htmlToMarkdown(html);
  assert.ok(backToMd.includes("==important=="));
});

test("escapes HTML entities accurately", () => {
  const raw = '<script>alert("test" & "x")</script>';
  const escaped = escapeHtml(raw);
  assert.equal(escaped, "&lt;script&gt;alert(&quot;test&quot; &amp; &quot;x&quot;)&lt;/script&gt;");
});

