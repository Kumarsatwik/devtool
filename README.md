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
npm run build     # production build
```
