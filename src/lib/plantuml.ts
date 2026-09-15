"use client";

import * as pako from "pako";

// PlantUML URL API: source text -> raw deflate -> PlantUML's 6-bit alphabet.
// Using pako (pure JS zlib) instead of CompressionStream for deterministic,
// cross-platform encoded output — CompressionStream wraps the system zlib
// which can produce different byte streams on different OS/zlib versions,
// breaking CI tests that assert on exact encoded URL paths.
const PLANTUML_SERVER =
  process.env.NEXT_PUBLIC_PLANTUML_SERVER ?? "https://www.plantuml.com/plantuml";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function encode6bit(b: number): string {
  return ALPHABET[b] ?? "?";
}

function encode64(data: Uint8Array): string {
  let out = "";
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i];
    const b2 = data[i + 1] ?? 0;
    const b3 = data[i + 2] ?? 0;
    out +=
      encode6bit((b1 >> 2) & 0x3f) +
      encode6bit((((b1 & 0x3) << 4) | (b2 >> 4)) & 0x3f) +
      encode6bit((((b2 & 0xf) << 2) | (b3 >> 6)) & 0x3f) +
      encode6bit(b3 & 0x3f);
  }
  return out;
}

export async function encodePlantUml(text: string): Promise<string> {
  const compressed = pako.deflateRaw(text, { level: 9 });
  return encode64(new Uint8Array(compressed));
}

export async function fetchPlantUmlSvg(text: string): Promise<string> {
  const res = await fetch(`${PLANTUML_SERVER}/svg/${await encodePlantUml(text)}`);
  if (!res.ok) {
    const detail = plantUmlErrorMessage(await res.text());
    throw new Error(detail ?? `PlantUML server error (${res.status})`);
  }
  return res.text();
}

/** PlantUML answers syntax errors with an SVG whose text describes the problem. */
export function plantUmlErrorMessage(body: string): string | null {
  const decode = (text: string) =>
    text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim();

  // Error SVGs are mostly boilerplate; the actual problem is one of the lines
  const lines = [...body.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
    .map((m) => decode(m[1]))
    .filter(Boolean);
  const message = lines.find((line) => /error/i.test(line)) ?? lines.at(-1);
  const fallback = decode(body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
  const detail = message ?? fallback;
  return detail ? detail.replace(/\s+/g, " ").slice(0, 300) : null;
}

/**
 * Canvas color for a PlantUML SVG. Prefer the background the SVG declares;
 * some themes (e.g. !theme cyborg) omit it and draw light text, so fall back
 * to a backdrop that contrasts with the SVG's own text fills.
 * ponytail: role/theme-based backdrop heuristic — replace if a theme ever
 * mixes light-on-dark and dark-on-light text in one diagram.
 */
export function plantUmlBackground(svg: string): string {
  const declared = svg.match(/background:\s*(#[0-9a-fA-F]{3,8})/i)?.[1];
  if (declared) return declared;

  const textFills = [...svg.matchAll(/<text[^>]*\sfill="(#[0-9a-fA-F]{3,6})"/g)].map(
    (m) => m[1],
  );
  const light = textFills.filter((color) => luminance(color) > 0.6).length;
  return light > textFills.length / 2 ? "#1e1e1e" : "#ffffff";
}

function luminance(color: string): number {
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  const value = parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
