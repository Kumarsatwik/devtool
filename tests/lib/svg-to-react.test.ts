import assert from "node:assert/strict";
import test from "node:test";
import { svgToReactComponent, type SvgToReactOptions } from "../../src/lib/svg-to-react.ts";

const svg = `<svg viewBox="0 0 10 10" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>`;

function options(overrides: Partial<SvgToReactOptions> = {}): SvgToReactOptions {
  return {
    componentName: "Icon",
    typescript: true,
    forwardRef: false,
    exportStyle: "default",
    includeProps: true,
    ...overrides,
  };
}

test("emits a TypeScript default-export component", () => {
  const output = svgToReactComponent(svg, options());

  assert.match(output, /import type \{ SVGProps \} from "react";/);
  assert.match(output, /export default function Icon/);
  assert.match(output, /viewBox="0 0 10 10"/);
  assert.match(output, /fill="red"/);
});

test("supports named exports without props", () => {
  const output = svgToReactComponent(
    svg,
    options({ exportStyle: "named", includeProps: false }),
  );

  assert.match(output, /export function Icon\(props: SVGProps<SVGSVGElement>\)/);
  assert.equal(output.includes("export default"), false);
  assert.equal(output.includes("size?: number | string"), false);
});

test("emits forwardRef components with a display name", () => {
  const output = svgToReactComponent(svg, options({ forwardRef: true }));

  assert.match(output, /forwardRef<SVGSVGElement, IconProps>/);
  assert.match(output, /Icon\.displayName = "Icon";/);
});

test("emits a JavaScript component without TypeScript imports", () => {
  const output = svgToReactComponent(
    svg,
    options({ typescript: false, includeProps: false }),
  );

  assert.equal(output.includes("SVGProps"), false);
  assert.match(output, /export default function Icon\(props\)/);
});

test("throws when no SVG element is present", () => {
  assert.throws(
    () => svgToReactComponent("<div>not an svg</div>", options()),
    /No valid SVG element found/,
  );
});
