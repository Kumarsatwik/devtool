import assert from "node:assert/strict";
import test from "node:test";
import {
  detectSensitive,
  isSensitiveHeader,
  maskValue,
} from "../../src/lib/har/sensitive.ts";
import type { HarEntry } from "../../src/lib/har/types.ts";

function makeEntry(overrides: Partial<HarEntry["request"]> = {}, response: Partial<HarEntry["response"]> = {}): HarEntry {
  return {
    request: { method: "POST", url: "https://example.test/", ...overrides },
    response: { status: 200, ...response },
  };
}

test("masks short, normal, and long values without leaking them", () => {
  assert.equal(maskValue(""), "••••••••");
  assert.equal(maskValue("abc"), "•••");
  assert.equal(maskValue("abcd"), "••••");
  assert.equal(maskValue("abcde"), "a•••e");
  assert.equal(maskValue("a".repeat(100)), "aa••••••••aa");
});

test("identifies sensitive headers by name or JWT value", () => {
  assert.equal(isSensitiveHeader("Authorization", "Bearer abc"), true);
  assert.equal(isSensitiveHeader("X-Api-Key", "abc"), true);
  assert.equal(
    isSensitiveHeader("X-Trace", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij"),
    true,
  );
  assert.equal(isSensitiveHeader("Accept", "text/html"), false);
});

test("finds sensitive headers, cookies, and JSON body fields", () => {
  const findings = detectSensitive(
    makeEntry(
      {
        headers: [{ name: "Authorization", value: "Bearer secret" }],
        cookies: [{ name: "session", value: "abc123" }],
        postData: {
          mimeType: "application/json",
          text: JSON.stringify({ password: "secret", email: "ari@example.test", ok: 1 }),
        },
      },
      {
        headers: [{ name: "Set-Cookie", value: "sid=secret" }],
        cookies: [{ name: "sid", value: "secret" }],
      },
    ),
  );

  const names = findings.map((finding) => finding.name);
  assert.ok(names.includes("Authorization"));
  assert.ok(names.includes("session"));
  assert.ok(names.includes("Set-Cookie"));
  assert.ok(names.includes("password"));
  assert.ok(names.includes("email"));
});

test("finds sensitive urlencoded body fields and caps duplicate findings", () => {
  const findings = detectSensitive(
    makeEntry({
      postData: { mimeType: "application/x-www-form-urlencoded", text: "password=secret&x=1" },
    }),
  );

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.name, "password");
  assert.equal(findings[0]?.value, "secret");
});
