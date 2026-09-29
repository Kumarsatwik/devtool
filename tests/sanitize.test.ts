import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeJson } from "../src/lib/sanitize.ts";

test("hide-all respects excluded nested keys and masks unkeyed array leaves", () => {
  const result = sanitizeJson(
    JSON.stringify({
      profile: { name: "Ari", email: "ari@example.test" },
      labels: ["internal", "priority"],
    }),
    {
      sensitiveKeys: ["labels"],
      redactionValue: "[HIDDEN]",
      matchMode: "exact",
      hideAllValues: true,
    },
  );

  assert.deepEqual(JSON.parse(result.output), {
    profile: { name: "Ari", email: "ari@example.test" },
    labels: ["[HIDDEN]", "[HIDDEN]"],
  });
});

test("hide-all masks primitive siblings in mixed root arrays", () => {
  const result = sanitizeJson(
    '["secret", {"name":"private"}]',
    {
      sensitiveKeys: ["name"],
      redactionValue: "[HIDDEN]",
      matchMode: "exact",
      hideAllValues: true,
    },
  );

  assert.deepEqual(JSON.parse(result.output), [
    "[HIDDEN]",
    { name: "[HIDDEN]" },
  ]);
});
