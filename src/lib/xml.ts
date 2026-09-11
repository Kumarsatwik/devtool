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

const TEXT_KEY = "#text";

export function xmlToJson(xml: string, options: XmlToJsonOptions = {}): string {
  const { spaces = 2, smartTypes = true, attributePrefix = "@" } = options;

  const doc = new DOMParser().parseFromString(xml.trim(), "application/xml");

  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    const detail = (parserError.textContent ?? "").replace(/\s+/g, " ").trim();
    throw new Error(detail || "The document is not well-formed XML");
  }

  const root = doc.documentElement;
  if (!root) throw new Error("No root element found");

  return JSON.stringify(
    { [root.nodeName]: elementToValue(root, smartTypes, attributePrefix) },
    null,
    spaces,
  );
}

function elementToValue(
  element: Element,
  smartTypes: boolean,
  attributePrefix: string,
): unknown {
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
    const value = elementToValue(child, smartTypes, attributePrefix);
    if (Object.prototype.hasOwnProperty.call(result, child.nodeName)) {
      const existing = result[child.nodeName];
      if (Array.isArray(existing)) existing.push(value);
      else result[child.nodeName] = [existing, value];
    } else {
      result[child.nodeName] = value;
    }
  }

  if (text) result[TEXT_KEY] = castValue(text, smartTypes);
  return result;
}

function castValue(value: string, smartTypes: boolean): string | number | boolean {
  if (!smartTypes) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  const trimmed = value.trim();
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return value;
}
