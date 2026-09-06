"use client";

import { loader } from "@monaco-editor/react";

/**
 * Point the Monaco loader at the self-hosted copy of the editor assets
 * (copied from node_modules into public/monaco/vs by scripts/copy-monaco.mjs)
 * instead of the default jsDelivr CDN. This keeps the app working fully
 * offline and stops the editor from making requests to a third-party CDN.
 */
let configured = false;

export function configureMonacoLoader(): void {
  if (configured || typeof window === "undefined") return;
  configured = true;
  loader.config({ paths: { vs: "/monaco/vs" } });
}