export interface SvgToReactOptions {
  componentName: string;
  typescript: boolean;
  forwardRef: boolean;
  exportStyle: "default" | "named";
  includeProps: boolean;
}

const SVG_ATTR_MAP: Record<string, string> = {
  "accent-height": "accentHeight",
  "alignment-baseline": "alignmentBaseline",
  "arabic-form": "arabicForm",
  "baseline-shift": "baselineShift",
  "cap-height": "capHeight",
  "clip-path": "clipPath",
  "clip-rule": "clipRule",
  "color-interpolation": "colorInterpolation",
  "color-interpolation-filters": "colorInterpolationFilters",
  "color-profile": "colorProfile",
  "color-rendering": "colorRendering",
  "dominant-baseline": "dominantBaseline",
  "enable-background": "enableBackground",
  "fill-opacity": "fillOpacity",
  "fill-rule": "fillRule",
  "flood-color": "floodColor",
  "flood-opacity": "floodOpacity",
  "font-family": "fontFamily",
  "font-size": "fontSize",
  "font-size-adjust": "fontSizeAdjust",
  "font-stretch": "fontStretch",
  "font-style": "fontStyle",
  "font-variant": "fontVariant",
  "font-weight": "fontWeight",
  "glyph-name": "glyphName",
  "glyph-orientation-horizontal": "glyphOrientationHorizontal",
  "glyph-orientation-vertical": "glyphOrientationVertical",
  "horiz-adv-x": "horizAdvX",
  "horiz-origin-x": "horizOriginX",
  "image-rendering": "imageRendering",
  "letter-spacing": "letterSpacing",
  "lighting-color": "lightingColor",
  "marker-end": "markerEnd",
  "marker-mid": "markerMid",
  "marker-start": "markerStart",
  "overline-position": "overlinePosition",
  "overline-thickness": "overlineThickness",
  "panose-1": "panose1",
  "paint-order": "paintOrder",
  "pointer-events": "pointerEvents",
  "rendering-intent": "renderingIntent",
  "shape-rendering": "shapeRendering",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "strikethrough-position": "strikethroughPosition",
  "strikethrough-thickness": "strikethroughThickness",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-opacity": "strokeOpacity",
  "stroke-width": "strokeWidth",
  "text-anchor": "textAnchor",
  "text-decoration": "textDecoration",
  "text-rendering": "textRendering",
  "underline-position": "underlinePosition",
  "underline-thickness": "underlineThickness",
  "unicode-bidi": "unicodeBidi",
  "unicode-range": "unicodeRange",
  "units-per-em": "unitsPerEm",
  "v-alphabetic": "vAlphabetic",
  "v-hanging": "vHanging",
  "v-ideographic": "vIdeographic",
  "v-mathematical": "vMathematical",
  "vert-adv-y": "vertAdvY",
  "vert-origin-x": "vertOriginX",
  "vert-origin-y": "vertOriginY",
  "word-spacing": "wordSpacing",
  "writing-mode": "writingMode",
  "x-height": "xHeight",
  "xlink:actuate": "xlinkActuate",
  "xlink:arcrole": "xlinkArcrole",
  "xlink:href": "xlinkHref",
  "xlink:role": "xlinkRole",
  "xlink:show": "xlinkShow",
  "xlink:title": "xlinkTitle",
  "xlink:type": "xlinkType",
  "xml:base": "xmlBase",
  "xml:lang": "xmlLang",
  "xml:space": "xmlSpace",
  "xmlns:xlink": "xmlnsXlink",
};

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function convertAttrName(name: string): string {
  if (name === "class") return "className";
  if (name === "for") return "htmlFor";
  if (name === "tabindex") return "tabIndex";
  if (name === "viewbox") return "viewBox";
  if (name === "preserveaspectratio") return "preserveAspectRatio";
  if (name === "contenteditable") return "contentEditable";
  // React requires data-* and aria-* attributes to keep their kebab-case form.
  if (name.startsWith("data-") || name.startsWith("aria-")) return name;
  return SVG_ATTR_MAP[name] || kebabToCamel(name);
}

function convertSvgAttributes(svgStr: string): string {
  return svgStr.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z_:][a-zA-Z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?)*)\s*(\/?)>/g,
    (match, tag, attrsStr, selfClose) => {
      if (!attrsStr) return match.replace(/\/?>$/, `${selfClose}>`);
      const converted = attrsStr.replace(
        /([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g,
        (
          _m: string,
          name: string,
          dVal?: string,
          sVal?: string,
          uVal?: string,
        ) => {
          const value = dVal ?? sVal ?? uVal ?? "true";
          const newName = convertAttrName(name.toLowerCase());
          const isNumeric = /^[\d.+-]+$/.test(value) && !isNaN(Number(value));
          if (isNumeric) {
            return `${newName}={${value}}`;
          }
          return `${newName}="${value}"`;
        },
      );
      return `<${tag}${converted}${selfClose}>`;
    },
  );
}

function cleanSvgString(svg: string): string {
  let cleaned = svg
    .replace(/<\?xml[^?]*\?>\s*/gi, "")
    .replace(/<!DOCTYPE[^>]*>\s*/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  if (!cleaned.startsWith("<svg")) {
    const svgMatch = cleaned.match(/<svg[\s\S]*<\/svg>/i);
    if (svgMatch) {
      cleaned = svgMatch[0];
    }
  }

  return cleaned;
}

export function svgToReactComponent(
  svgInput: string,
  options: SvgToReactOptions,
): string {
  const { componentName, typescript, forwardRef, exportStyle, includeProps } =
    options;

  const cleaned = cleanSvgString(svgInput);
  if (!cleaned.includes("<svg")) {
    throw new Error("No valid SVG element found in the input.");
  }

  const jsxSvg = convertSvgAttributes(cleaned);

  const lines: string[] = [];

  if (typescript) {
    if (forwardRef) {
      lines.push(`import { forwardRef, type SVGProps } from "react";`);
      lines.push("");
      if (includeProps) {
        lines.push(`type ${componentName}Props = SVGProps<SVGSVGElement> & {`);
        lines.push(`  size?: number | string;`);
        lines.push(`  title?: string;`);
        lines.push(`};`);
        lines.push("");
        lines.push(
          `const ${componentName} = forwardRef<SVGSVGElement, ${componentName}Props>(`,
        );
        lines.push(`  ({ size, title, ...props }, ref) => (`);
        lines.push(`    <>`);
        lines.push(`      {title && <title>{title}</title>}`);
      } else {
        lines.push(
          `const ${componentName} = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(`,
        );
        lines.push(`  (props, ref) => (`);
      }

      const svgWithRef = jsxSvg.replace("<svg", "<svg ref={ref}");
      const svgWithSize = includeProps
        ? svgWithRef.replace(
            /(<svg[^>]*?)>/,
            "$1 width={size} height={size} {...props}>",
          )
        : svgWithRef.replace(/(<svg[^>]*?)>/, "$1 {...props}>");

      lines.push(`      ${svgWithSize}`);
      if (includeProps) {
        lines.push(`    </>`);
      }
      lines.push(`  )`);
      lines.push(`);`);
      lines.push("");
      lines.push(`${componentName}.displayName = "${componentName}";`);
    } else {
      lines.push(`import type { SVGProps } from "react";`);
      lines.push("");
      if (includeProps) {
        lines.push(`type ${componentName}Props = SVGProps<SVGSVGElement> & {`);
        lines.push(`  size?: number | string;`);
        lines.push(`  title?: string;`);
        lines.push(`};`);
        lines.push("");
        lines.push(
          `export ${exportStyle === "default" ? "default " : ""}function ${componentName}({ size, title, ...props }: ${componentName}Props) {`,
        );
        lines.push(`  return (`);
        lines.push(`    <>`);
        lines.push(`      {title && <title>{title}</title>}`);
      } else {
        lines.push(
          `export ${exportStyle === "default" ? "default " : ""}function ${componentName}(props: SVGProps<SVGSVGElement>) {`,
        );
        lines.push(`  return (`);
      }

      const svgWithSize = includeProps
        ? jsxSvg.replace(
            /(<svg[^>]*?)>/,
            "$1 width={size} height={size} {...props}>",
          )
        : jsxSvg.replace(/(<svg[^>]*?)>/, "$1 {...props}>");

      lines.push(`    ${svgWithSize}`);
      if (includeProps) {
        lines.push(`    </>`);
      }
      lines.push(`  );`);
      lines.push(`}`);
    }
  } else {
    if (forwardRef) {
      lines.push(`import { forwardRef } from "react";`);
      lines.push("");
      if (includeProps) {
        lines.push(
          `const ${componentName} = forwardRef(function ${componentName}({ size, title, ...props }, ref) {`,
        );
        lines.push(`  return (`);
        lines.push(`    <>`);
        lines.push(`      {title && <title>{title}</title>}`);
      } else {
        lines.push(
          `const ${componentName} = forwardRef(function ${componentName}(props, ref) {`,
        );
        lines.push(`  return (`);
      }

      const svgWithRef = jsxSvg.replace("<svg", "<svg ref={ref}");
      const svgWithSize = includeProps
        ? svgWithRef.replace(
            /(<svg[^>]*?)>/,
            "$1 width={size} height={size} {...props}>",
          )
        : svgWithRef.replace(/(<svg[^>]*?)>/, "$1 {...props}>");

      lines.push(`    ${svgWithSize}`);
      if (includeProps) {
        lines.push(`    </>`);
      }
      lines.push(`  );`);
      lines.push(`});`);
      lines.push("");
      lines.push(`${componentName}.displayName = "${componentName}";`);
    } else {
      if (includeProps) {
        lines.push(
          `export ${exportStyle === "default" ? "default " : ""}function ${componentName}({ size, title, ...props }) {`,
        );
        lines.push(`  return (`);
        lines.push(`    <>`);
        lines.push(`      {title && <title>{title}</title>}`);
      } else {
        lines.push(
          `export ${exportStyle === "default" ? "default " : ""}function ${componentName}(props) {`,
        );
        lines.push(`  return (`);
      }

      const svgWithSize = includeProps
        ? jsxSvg.replace(
            /(<svg[^>]*?)>/,
            "$1 width={size} height={size} {...props}>",
          )
        : jsxSvg.replace(/(<svg[^>]*?)>/, "$1 {...props}>");

      lines.push(`    ${svgWithSize}`);
      if (includeProps) {
        lines.push(`    </>`);
      }
      lines.push(`  );`);
      lines.push(`}`);
    }
  }

  return lines.join("\n");
}

export const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 16v-4"/>
  <path d="M12 8h.01"/>
</svg>`;
