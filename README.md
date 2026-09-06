# DataTools

Free, 100% client-side developer tools for JSON, CSV, HAR, Markdown, Mermaid and HTML — built with Next.js, Tailwind CSS, and shadcn/ui. All processing happens in the browser; nothing is uploaded.

## Tools

JSON Beautifier · JSON Validator · JSON Compare · JSON Sanitizer · JSON↔CSV · JS↔JSON · Epoch Converter · HAR Analyzer · CSV↔JSON · Excel→CSV · Markdown Preview · Mermaid Diagram · HTML Playground

The tool catalog lives in `src/lib/tools.ts` (drives the homepage and sidebar), and per-tool SEO metadata in `src/lib/seo.ts`.

## Development

```bash
npm install
npm run dev       # start dev server
npm run check     # typecheck + lint
npm test          # unit tests (node:test)
npm run build     # production build
```

Tests live in `tests/` and run with Node's built-in test runner (no extra
dependencies). They include regression tests for the JSON diff/sort edge
cases, the safe JS-literal parser, and the JSON sanitizer.

The Monaco editor assets are self-hosted: `npm run dev` / `npm run build`
copy them from `node_modules` into `public/monaco/vs` via
`scripts/copy-monaco.mjs` (gitignored), so the app — including the code
editor — makes no requests to any CDN and works fully offline. The HTML
playground preview additionally enforces a strict Content-Security-Policy
that blocks all network access from user code.
