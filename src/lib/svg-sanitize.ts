"use client";

export const SAFE_SVG_ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textPath",
  "title",
  "desc",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "symbol",
  "use",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
]);

export function isSafeSvgElement(name: string): boolean {
  return SAFE_SVG_ELEMENTS.has(name);
}

export function isUnsafeSvgAttribute(name: string, value: string): boolean {
  const lowerName = name.toLowerCase();
  const trimmedValue = value.trim();

  if (
    lowerName.startsWith("on") ||
    lowerName === "style" ||
    lowerName === "src" ||
    lowerName === "xml:base"
  ) {
    return true;
  }

  if (lowerName === "href" || lowerName === "xlink:href") {
    return !/^#[\w:.-]+$/.test(trimmedValue);
  }

  if (/\b(?:javascript|vbscript|data):/i.test(trimmedValue)) {
    return true;
  }

  return (
    /url\s*\(/i.test(trimmedValue) &&
    !/^(?:[^)]|url\s*\(\s*#[\w:.-]+\s*\))*$/i.test(trimmedValue)
  );
}

/** Elements to sanitize, children before parents. The root is added in the security fix. */
export function svgElementsToSanitize(root: Element): Element[] {
  return Array.from(root.querySelectorAll("*")).reverse();
}

export function sanitizeSvgForPreview(svg: string): string {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = parsed.documentElement;

  if (
    parsed.querySelector("parsererror") ||
    root.localName !== "svg" ||
    (root.namespaceURI && root.namespaceURI !== "http://www.w3.org/2000/svg")
  ) {
    return "";
  }

  for (const element of svgElementsToSanitize(root)) {
    if (!isSafeSvgElement(element.localName)) {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      if (isUnsafeSvgAttribute(attribute.name, attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  return new XMLSerializer().serializeToString(root);
}
