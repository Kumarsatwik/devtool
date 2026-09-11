/**
 * Convert XML text into a JSON string using the browser's native DOMParser.
 *
 * Conventions:
 * - attributes become `@name` keys
 * - repeated sibling elements with the same tag collapse into an array
 * - text mixed with child elements is stored under `#text`
 */

export interface XmlToJsonOptions {
  spaces?: number;
  smartTypes?: boolean;
  attributePrefix?: string;
}

// ponytail: fixed depth ceiling; real documents are far shallower.
const MAX_DEPTH = 1000;
const DECIMAL_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function xmlToJson(xml: string, options: XmlToJsonOptions = {}): string {
  const { spaces = 2, smartTypes = true, attributePrefix = "@" } = options;

  const doc = new DOMParser().parseFromString(xml.trim(), "application/xml");

  // Browsers report malformed XML as a namespaced `parsererror` element, but a
  // valid document may contain an element with that name — the namespace tells
  // the engine's own error element apart from real data.
  const parserError = doc.getElementsByTagName("parsererror")[0];
  const errorNamespace = parserError?.namespaceURI;
  if (
    parserError &&
    errorNamespace &&
    (errorNamespace === "http://www.w3.org/1999/xhtml" ||
      errorNamespace.includes("mozilla.org"))
  ) {
    const detail = (parserError.textContent ?? "").replace(/\s+/g, " ").trim();
    throw new Error(detail || "The document is not well-formed XML");
  }

  const root = doc.documentElement;
  if (!root) throw new Error("No root element found");

  return JSON.stringify(
    { [root.nodeName]: elementToValue(root, smartTypes, attributePrefix, 0) },
    null,
    spaces,
  );
}

function elementToValue(
  element: Element,
  smartTypes: boolean,
  attributePrefix: string,
  depth: number,
): unknown {
  if (depth > MAX_DEPTH) {
    throw new Error(
      `XML nesting exceeds the supported depth of ${MAX_DEPTH} levels`,
    );
  }

  const childElements = Array.from(element.children);
  const attributes = Array.from(element.attributes);
  const text = Array.from(element.childNodes)
    .filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE ||
        node.nodeType === Node.CDATA_SECTION_NODE,
    )
    .map((node) => node.nodeValue ?? "")
    .join("")
    .trim();

  if (childElements.length === 0 && attributes.length === 0) {
    return castValue(text, smartTypes);
  }

  // Null prototype so tags named `__proto__` stay plain data.
  const result: Record<string, unknown> = Object.create(null);

  for (const attribute of attributes) {
    result[`${attributePrefix}${attribute.name}`] = castValue(
      attribute.value,
      smartTypes,
    );
  }

  for (const child of childElements) {
    const value = elementToValue(child, smartTypes, attributePrefix, depth + 1);
    if (Object.prototype.hasOwnProperty.call(result, child.nodeName)) {
      const existing = result[child.nodeName];
      if (Array.isArray(existing)) existing.push(value);
      else result[child.nodeName] = [existing, value];
    } else {
      result[child.nodeName] = value;
    }
  }

  if (text) result["#text"] = castValue(text, smartTypes);
  return result;
}

function castValue(value: string, smartTypes: boolean): string | number | boolean {
  if (!smartTypes) return value;
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (DECIMAL_RE.test(trimmed)) {
    const numeric = Number(trimmed);
    // Reject values that JSON cannot represent (Infinity/NaN) and integers that
    // would silently lose precision (e.g. 64-bit IDs) — keep those as strings.
    if (
      Number.isFinite(numeric) &&
      !(Number.isInteger(numeric) && !Number.isSafeInteger(numeric))
    ) {
      return numeric;
    }
  }
  return value;
}
