import assert from "node:assert/strict";
import test from "node:test";
import { WELCOME_HTML } from "../../src/lib/notes/welcome-content.ts";

test("welcome content keeps the editor onboarding example", () => {
  assert.match(WELCOME_HTML, /<h2>Welcome/);
  assert.match(WELCOME_HTML, /data-type="mermaid"/);
  assert.match(WELCOME_HTML, /switch to the Markdown pane/);
});
