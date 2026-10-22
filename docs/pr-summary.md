# Codebase Overhaul — PR Summary

**Branch:** `refactor/codebase-overhaul`  
**Base:** `main`  
**Scope:** Track A structural refactor + Track B security hardening  
**Status:** Implemented and verified; Track C correctness work remains a separate backlog.

## Highlights

### Security
- Sanitizes the root `<svg>` element, closing the remaining active-attribute path into `dangerouslySetInnerHTML`.
- Generates POSIX-shell-safe cURL commands: every argument is quoted, URLs use `--url`, and invalid HTTP methods are rejected.
- Escapes note titles/headings in HTML and DOCX exports.
- Renders notes Mermaid with `securityLevel: "strict"` and one renderer config owner.
- Enforces the Excel route's advertised 10 MB limit before reading.
- Removes the playground's app-origin top-level `Open` path, trims sandbox capabilities, and corrects the network claim.
- Adds a restrictive CSP to note previews/exports, removes remote Google Fonts, and drops popup-escape sandbox flags.
- Hide-all now redacts keys added after the toggle is enabled; only explicit exclusions are exposed.
- Upgrades production dependencies: Next 16.4.2, Mermaid 12.2.0, TipTap 3.32, Base UI 1.9, Monaco 0.57, and SheetJS 0.20.3 from the supported vendor tarball. Production audit is clean.

### Structure
- Split the 937-line HAR module into `lib/har/{types,classify,sensitive,body,insights,analyze,curl,report,filters,sample,index}.ts` with a stable public barrel.
- Reduced `har-analyzer/page.tsx` from 559 to 261 lines by moving sample data, report serializers, filters, and downloads.
- Moved HTML playground document/CSP/console-bridge assembly into `lib/html-playground.ts`; route is 413 lines.
- Removed the Mermaid request-simulation feature entirely; route is 593 lines and only handles editor, render, zoom/fullscreen, export, and copy.
- Moved epoch helpers/components and Markdown extensions/welcome content out of route files.
- Grouped app chrome under `components/shell/`, standardized route layouts to `Layout`, and renamed converter screens to `*Panel`.
- Added shared `clipboard`, `pagination`, `upload`, `bytes`, `format`, `useAutoRun`, `useCopyFeedback`, and `useNoteExport` modules.
- Separated tool icons from catalog data (`tool-icons.ts`) and renamed catalog exports to `NAV_GROUPS`/`TOOLS`.
- Normalized JSON/CSV APIs (`validateJson`, `beautifyJson`, `parseCsv`, `jsonToCsv`, `redactJson`, etc.) and moved formatters out of the HAR module.

### Tests and tooling
- `scripts/blast-radius.mjs` builds the import graph, detects cycles, enforces dependency direction, and reports changed-file dependents.
- Contract tests guard public exports, catalog/route integrity, and architecture boundaries.
- Characterization tests cover CSV, JSON literal parsing, redaction, HAR analysis/insights/body/cURL/reports, SVG sanitization, note HTML escaping, pagination, upload limits, epoch helpers, and SheetJS round-trips.
- CI now runs typecheck/lint with `--max-warnings=0`, recursive tests, coverage, production build, and blast-radius.
- `npm run test:coverage`: **88.89% lines / 77.83% branches / 91.77% functions**.

## Behavior changes (Track B)

| Area | Change |
|---|---|
| SVG preview | Root `onload`/`style`/`href` and other active attributes are removed. Benign icons are unchanged. |
| cURL copy | Commands are quoted; URLs use `--url`; invalid methods return an explanatory comment instead of shell syntax. |
| Note exports | Titles containing `&`, `<`, `>`, or quotes render as text instead of markup. |
| Notes Mermaid | Strict security; HTML labels/links that depended on loose mode may no longer render. |
| Excel upload | Files over 10 MB are rejected before reading, matching the advertised limit. |
| Playground | The standalone `Open` action is removed; Download remains. Forms/popups are blocked. |
| Note previews/exports | Remote fonts/images and scripts are blocked by CSP; the editorial theme uses local fallbacks. |
| Hide-all | Newly pasted keys are redacted; removing a key chip explicitly exposes its subtree. |
| Mermaid tool | The request-simulation feature and its graph/simulation modules are removed. |

## Verification

```bash
npm run check          # tsc --noEmit + eslint --max-warnings=0
npm test               # 103 passing
npm run test:coverage  # 88.89% lines / 77.83% branches
npm run build          # production build, all routes prerendered
npm run blast-radius   # 115 modules, 0 cycles, 0 boundary violations
```

Production audit: **0 vulnerabilities**. Remaining advisories are dev-only ESLint/Monaco chains (`eslint-config-next`/`fast-glob`/`braces` and `monaco-editor`/`dompurify`).

## Deferred — Track C

The following are documented but intentionally not folded into this behavior-neutral/security branch:

- JSON numeric-token preservation and precision policy.
- CSV union-of-keys schema and formula-safety policy.
- SVG→React parser/JSX correctness (attributes, styles, forwardRef, dimensions).
- HAR validation/classification edge cases (304 redirect, CORS origins, public suffixes, transfer sizes, large archives).
- Notes debounce/lifecycle and source-pane synchronization.
- Keyboard/focus guarantees for uploads, drawers, and mobile navigation.
- Large-file workers and bounded body rendering.
- Catalog capability metadata (PDF export, comparison summary).

Each needs its own failing regression test and product decision.

## Review guide

- Security fixes: `fix(security): ...` commits.
- HAR split/route extraction: `refactor(har): ...`.
- Shared behavior and naming: `refactor(shared)`, `refactor(json)`, `refactor(csv)`, `refactor(catalog)`.
- Mermaid simulation removal: `refactor(mermaid): remove ...` and `delete ...`.
- Dependencies: `chore(deps): ...`.
- Tooling: `chore(tooling)`, `test(contract)`, `test(lib)`.

## Operational notes

- Node `>=22.18` is required for unflagged TypeScript type stripping in tests.
- `xlsx` is installed from the supported SheetJS vendor tarball (`0.20.3`), not the unmaintained npm `0.18.5`.
- The shadcn Tailwind stylesheet is vendored at `src/app/shadcn-tailwind.css`; the CLI package was removed.
- `next` and `eslint-config-next` are pinned to `16.4.2`.
