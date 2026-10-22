import assert from "node:assert/strict";
import test from "node:test";
import { redactJson } from "../../src/lib/json-redact.ts";

test("hide-all respects excluded nested keys and masks unkeyed array leaves", () => {
  const result = redactJson(
    JSON.stringify({
      profile: { name: "Ari", email: "ari@example.test" },
      labels: ["internal", "priority"],
    }),
    {
      sensitiveKeys: [],
      excludedKeys: ["profile"],
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
  const result = redactJson(
    '["secret", {"name":"private"}]',
    {
      sensitiveKeys: [],
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

test("hide-all redacts keys that were added after the toggle was enabled", () => {
  const result = redactJson('{"known":"a","newKey":"b"}', {
    sensitiveKeys: [],
    redactionValue: "[HIDDEN]",
    matchMode: "exact",
    hideAllValues: true,
  });

  assert.deepEqual(JSON.parse(result.output), {
    known: "[HIDDEN]",
    newKey: "[HIDDEN]",
  });
});

test("hide-all exposes only explicitly excluded keys and their subtrees", () => {
  const result = redactJson(
    '{"profile":{"name":"Ari"},"other":{"value":"secret"},"keep":"visible"}',
    {
      sensitiveKeys: [],
      excludedKeys: ["profile", "keep"],
      redactionValue: "[HIDDEN]",
      matchMode: "exact",
      hideAllValues: true,
    },
  );

  assert.deepEqual(JSON.parse(result.output), {
    profile: { name: "Ari" },
    other: { value: "[HIDDEN]" },
    keep: "visible",
  });
});
