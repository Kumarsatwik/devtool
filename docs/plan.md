# Codebase Overhaul — Migration Plan

> **Status: Approved migration plan. Phase 0 executed; source refactor not started.**
> **Branch:** `refactor/codebase-overhaul`
> **Baseline:** `1d22579` (includes the Mermaid flow work previously staged)
> **Date:** 2026-10-21

> The current-HEAD findings are in [`docs/audit.md`](./audit.md).

> **Feature update (2026-10-21):** The Mermaid request-simulation feature was removed. The target tree and phases below no longer include the simulation engine, graph extraction, playback hooks, or simulation controls.

---

## 0. Tooling reality check

`poteto-mode`, the **Refactoring playbook**, `how`, `interrogate`, `architect`, and `blast-radius` are **not installed** in this session. Only `deslop` exists. I will not pretend those commands ran.

| Requested | Actual substitute |
|---|---|
| `how` directory/dependency map | Explore agents + `scripts/blast-radius.mjs` import graph (new, dependency-free) |
| `interrogate` audit | Four parallel read-only audits (structure, security, architecture, tests) + direct source verification |
| `architect` | Architecture audit + this plan; no DDD/repositories/DI/backend |
| `deslop` | Installed skill; run on `git diff main...HEAD` after each phase |
| `blast-radius` | `scripts/blast-radius.mjs` + `tsc --noEmit` + `next build` + contract tests |

---

## 1. Contract and constraints

### 1.1 Two tracks, hard-gated

- **Track A — structural refactor. Zero observable behavior change.**
  Same rendered output, same exported bytes, same route URLs, same network requests, same error/success messages, same sample content. Only module paths, internal symbol names, dead code, and duplicate implementations consolidated with byte-identical output may change.
- **Track B — security hardening. Behavior-changing, separately approved.**
  Every fix gets a failing regression test first, a written behavior delta, and its own commit. Track B does not start until Track A's final review is approved.
- **Track C — correctness backlog. Documented, not executed here.**
  Conversion/data-fidelity fixes that are behavior-changing and need product decisions.

### 1.2 Approved decisions

- Branch: `refactor/codebase-overhaul`; baseline commit preserves the staged Mermaid work; `main` is untouched.
- Naming: kebab-case files; PascalCase components/types; camelCase functions/variables; `SCREAMING_SNAKE_CASE` module constants; acronyms treated as words (`XmlToJson`, `jsonToCsv`, `HarEntry`).
- Full roadmap, phased, with gates.
- Do **not** add DDD aggregates, repositories, DI containers, a backend, or a generic `src/types/` folder. This is a static client-side tool suite.

### 1.3 Stop points

1. **After Phase 0** — write `docs/audit.md` and `docs/plan.md`, commit them, and stop. Do not touch source until the user explicitly approves those docs.
2. **After Phase 8** — show the Track A PR summary and proof of behavior neutrality; stop before any Track B commit.

---

# Part II — Target design

## 2.1 Target structure

```text
src/
  app/                          # routes only: composition + metadata
    <tool>/page.tsx             # target <= ~200 lines, composition only
    <tool>/layout.tsx           # 3-4 lines, explicit metadata, named Layout
    layout.tsx  page.tsx  globals.css  sitemap.ts  robots.ts
  components/
    shell/                      # navigation, app-shell, tool-page, nav-groups, logo, theme-*
    status-message.tsx
    copy-button.tsx
    editor-panel.tsx
    file-upload.tsx
    resizable-split.tsx
    converters/
      converter-shell.tsx
      direction-tabs.tsx
      csv-to-json-panel.tsx
      json-to-csv-panel.tsx
      json-to-js-panel.tsx
      js-to-json-panel.tsx
    har/
      pagination-bar.tsx
      body-viewer.tsx  domains-view.tsx  empty-state.tsx  masked-value.tsx
      overview.tsx  privacy-badge.tsx  request-detail.tsx  request-drawer.tsx
      request-explorer.tsx  timeline.tsx
    notes/
      notes.css
      diagram-node.tsx          # renamed from diagram-block.tsx
      extensions.ts
      markdown-pane.tsx  note-preview.tsx  slide-deck.tsx  toolbar.tsx
    epoch/
      result-row.tsx
    ui/                         # shadcn primitives
  hooks/
    use-auto-run.ts
    use-copy-feedback.ts
    use-debounced.ts
    use-note-export.ts
  lib/
    json.ts                     # pure
    json-redact.ts              # was sanitize.ts
    csv.ts                      # pure
    xml.ts                      # browser-only; explicit client boundary
    svg-to-react.ts             # pure
    svg-sanitize.ts             # DOM sanitizer + pure policy predicates
    epoch.ts                    # pure date helpers
    html-playground.ts          # pure document/CSP builders
    upload.ts                   # limits + file validation
    bytes.ts                    # byteLength
    format.ts                   # formatBytes, formatMs (exact current strings)
    download.ts                 # saveTextFile/saveBlob with explicit revoke timing
    clipboard.ts                # copyText
    pagination.ts               # paginationPages
    samples.ts                  # existing sample payloads, one constant each
    tools.ts                    # pure catalog data
    tool-icons.tsx              # icon components, separate from data
    seo.ts  tool-redirects.ts  split.ts  monaco-config.ts  utils.ts
    har/
      types.ts  classify.ts  sensitive.ts  insights.ts  analyze.ts
      body.ts  curl.ts  filters.ts  report.ts  sample.ts  index.ts
    mermaid/
      render.ts                 # was diagrams.ts
      export.ts                 # was mermaid-export.ts
      themes.ts                 # was mermaid-themes.ts
    notes/
      markdown.ts  slides.ts  exporters.ts  diagram-html.ts  welcome-content.ts
tests/
  contract/
    public-surface.test.ts
    architecture.test.ts
    catalog-routes.test.ts
  lib/
    json.test.ts  har.test.ts  csv.test.ts  json-redact.test.ts
    split.test.ts  svg-to-react.test.ts  notes-markdown.test.ts
    seo.test.ts  tool-redirects.test.ts  tools.test.ts
  fixtures/
    har.ts
```

**Deleted:** `src/lib/markdown-export.ts`, `src/lib/flow-timeline.ts`, `src/lib/sanitize.ts` (renamed), `src/lib/har.ts` (split), `src/lib/diagrams.ts` (renamed), `src/lib/mermaid-export.ts` (renamed), `src/lib/mermaid-themes.ts` (renamed), `src/lib/flow-*.ts` (renamed), `src/types/`.

## 2.2 Naming rules

| Kind | Rule | Examples |
|---|---|---|
| Files/folders | kebab-case | `json-redact.ts`, `request-explorer.tsx`; Next reserved names unchanged |
| Components | PascalCase; acronyms as words | `CsvToJsonPanel`, `XmlToJsonPage`, `HarAnalyzerPage` |
| Non-route components | no `Page` suffix | `CsvToJsonPanel`, not `CSVToJSONPage` |
| Functions/variables | camelCase; acronyms as words | `jsonToCsv`, `parseHar`, `redactJson`, `formatBytes` |
| Types/interfaces | PascalCase; acronyms as words | `CsvParseResult`, `SvgToReactOptions`, `HarEntry` |
| Module constants | `SCREAMING_SNAKE_CASE` | `NAV_GROUPS`, `TOOLS`, `SAMPLE_JSON`, `PREVIEW_CSP`, `MAX_UPLOAD_MB` |
| Hooks | `useX` in `use-x.ts` | `useCopyFeedback`, `useAutoRun` |
| Route layouts | default export named `Layout` | every `app/*/layout.tsx` |
| Types location | next to the module that produces them | no `src/types/` |
| Client boundary | `"use client"` only on DOM/browser modules | `xml.ts`, `notes/slides.ts`, `notes/exporters.ts`, `notes/diagram-html.ts`, `mermaid/export.ts`, `mermaid/graph-dom.ts` |

## 2.3 Dependency rules

```text
app/*            -> components/*, lib/*, hooks/*
components/*     -> lib/*, hooks/*, components/ui/*
hooks/*          -> lib/*
lib/*            -> lib/* only
```

Enforced by `tests/contract/architecture.test.ts`:

1. `src/lib/**` must not import `src/components/**` or `src/app/**`.
2. `components/featureA/**` must not import types from `components/featureB/**`.
3. Relative imports inside `src/lib/**` must include `.ts` (Node-testable).
4. Pure modules must not contain `"use client"` or browser globals (`document`, `window`, `DOMParser`, `Blob` where avoidable).
5. No new `src/types/` directory; types stay beside producers.
6. No import cycles.

## 2.4 Patterns to adopt (and reject)

**Adopt**

- Pure domain modules, thin browser adapters (`*-dom.ts` or `"use client"`), and route pages as composition.
- One implementation per contract: CSV parse/serialize, clipboard, download, pagination, status classification, upload validation.
- Explicit ownership for Mermaid configuration and render lifecycle (Track B).
- Discriminated operation results (`empty | pending | success | invalid | cancelled | stale`) for Track B/C, not Track A.
- Types beside producers; catalog data separated from icon components.
- Characterization tests before every move; contract tests as the blast-radius guard.

**Reject**

- DDD aggregates/entities/value objects for a client tool suite.
- Repository layers, DI containers, service locators, microservices, or a backend.
- A generic `utils.ts` grab-bag or `src/types/` dumping ground.
- Blanket rewrites or cosmetic churn without a test or a contract.

---

# Part III — Ordered migration plan

## Phase 0 — Baseline and artifacts (no source changes)

> **Status: complete.** The branch and baseline commit already existed at `1d22579`; `.gitignore` was fixed; stray files and empty unrelated directories were removed; `docs/audit.md` and `docs/plan.md` were written. No source files were changed.

1. Verify `git status`, `git log`, and that the two staged Mermaid files are coherent. Run `npm run check` and `npm test` on the baseline; if they fail, stop and report instead of committing.
2. Create the branch: `git switch -c refactor/codebase-overhaul`. If the branch already exists, stop and report rather than force.
3. Commit the staged Mermaid work as a clearly labeled baseline commit (`chore: preserve pre-refactor mermaid flow work`). Do not squash it into refactor commits.
4. Fix `.gitignore`: remove blanket `*.md`; add targeted `docs/` exceptions; ignore `codedb.snapshot`, `exports/`, `public/pdfjs/`, `.commandcode/`, `.agents/`, `.eslintcache`, `*.log`. Keep `.DS_Store`, `.next`, `out`, `build`, `coverage`, `public/monaco`.
5. Remove local junk: `src/app/mermaid-diagram/# AI Document Formatting for CKEditor 5:.md.md`, root/src `.DS_Store`, and empty `src/app/{json-formatter,rich-text-formatter,interview-plan}` directories. Leave the four redirect-source directories alone (they are documented redirect origins).
6. Write `docs/audit.md` (Part I) and `docs/plan.md` (Part II + III) from this plan. Keep `CODEBASE_REVIEW.md` as historical, with a note that `docs/audit.md` supersedes it for current HEAD.
7. Commit `docs: add audit and refactor plan`.
8. **STOP. Show `docs/audit.md` and `docs/plan.md`. Do not run Phase 1 until the user explicitly approves.**

**Gate:** branch exists; baseline commit contains the staged Mermaid work; docs are tracked and visible in `git status`; no source files changed by the docs commit.

## Phase 1 — Test harness and characterization pins

1. Add `scripts/blast-radius.mjs` (no dependencies):
   - Parse static imports, re-exports, and dynamic `import()` from `src/**/*.{ts,tsx}`; resolve `@/` to `src/`.
   - Build the forward/reverse graph; detect cycles; enforce the dependency rules in §2.3.
   - Accept changed files (default: `git diff --name-only main...HEAD`) and print transitive dependents.
   - Add `"blast-radius": "node scripts/blast-radius.mjs"` to `package.json`.
2. Update `package.json`:
   - `"test": "node --test \"tests/**/*.test.ts\""`
   - `"test:coverage": "node --test --experimental-test-coverage \"tests/**/*.test.ts\""`
   - `"check": "tsc --noEmit && eslint . --max-warnings=0"` (after Phase 2 removes existing warnings)
   - `"engines": { "node": ">=22.18" }`
   - Do **not** add `"type": "module"` (breaks `next.config.ts` `__dirname`).
3. Update CI: keep `npm ci`, `npm run check`, `npm test`; add `npm run test:coverage`, `npm run build`, and `npm run blast-radius` for pull requests. Build is required so `prebuild`/`copy-monaco.mjs` is exercised.
4. Add contract tests:
   - `tests/contract/public-surface.test.ts` — pin export names for every `src/lib` module.
   - `tests/contract/architecture.test.ts` — dependency rules, purity, `.ts` extension, no cycles.
   - `tests/contract/catalog-routes.test.ts` — every `TOOLS[].href` resolves to `app/**/page.tsx`; every redirect source has no page; destinations resolve; unique hrefs; sitemap count.
5. Add pure characterization tests **before any move**:
   - `json.ts`: `parseJsLiteral` (quoted/unquoted keys, comments, trailing commas, hex/octal/binary, `undefined`/`Infinity`/`NaN`, sparse arrays, `__proto__`, error text), `sortJsonValue`, `validateJson`, `beautifyJson`/`minifyJson` throw paths.
   - `har.ts`: `buildCurl` argv matrix (`&`, quotes, `$`, backticks, newlines, empty headers), `parseHar` failure modes, `analyzeHar` status/origin/size/domain rules on a synthetic fixture, `baseDomain`, `maskValue`, `isSensitiveHeader`, `decodeBody`, `isBinaryBody`, `prettyBody`, `formatBytes`/`formatMs` boundaries.
   - `csv.ts`: header/delimiter/empty/duplicate-header, `parseCsv`, `jsonToCsv` union schema, nested values, empty/non-array throws.
   - `sanitize.ts`: `contains` vs `exact`, null redaction, circular refs, invalid JSON, root primitives/arrays, `collectAllKeys`, `PRESET_SENSITIVE_KEYS`, full `SanitizeResult` envelope.
   - `flow-graph.ts`: edge endpoint parsing, source IDs, classification, self-loops, unknown endpoints, trace depth/cycle/truncation.
   - `flow-simulation.ts`: default config, read/write marker round-trip, clamping, determinism, event cap, sampling boundaries.
   - `svg-to-react.ts`: full option matrix, prolog/DOCTYPE/comment stripping, attribute casing, numeric-vs-string props, `No valid SVG element` throw.
   - `notes/markdown.ts`: gfm tables, task lists, `<u>`, non-mermaid fences, `==` inside code fences, entity order.
   - `mermaid-themes.ts`, `seo.ts`, `tool-redirects.ts`, `tools.ts`, `utils.ts`.
   - `tests/fixtures/har.ts`: synthetic HAR builder; never commit real captures.
6. If a characterization test reveals a bug, **pin current behavior** and add the finding to `docs/audit.md`; do not fix it in Track A.
7. **Gate:** `npm test`, `npm run check`, `npm run build`, `npm run blast-radius` all green with the app unchanged.

## Phase 2 — Dead code and no-op removal (Track A)

1. Delete `src/lib/markdown-export.ts`.
2. Delete `src/lib/flow-timeline.ts`; remove `buildFlowTrace`, `FlowTrace`, `FlowHop`, `MAX_TRACE_HOPS` from `src/lib/flow-graph.ts`; verify no consumers.
3. Collapse `src/lib/diagrams.ts`:
   - Remove `detectDiagramKind` and `renderDiagramSvg`; update `components/notes/diagram-block.tsx:10,44` and `lib/notes/diagram-html.ts:3,77` to call `renderMermaidSvg` directly.
   - Keep `DiagramKind` only if a real multi-kind abstraction is planned; otherwise remove it.
   - Replace `tests/diagrams.test.ts` with a pure `getMermaidConfig` test or delete it.
4. Delete unused `csvToJSON`; keep `parseCSV`/`jsonToCSV` for Phase 3.
5. Remove `isDiagramTheme`, `isHomepage`/`usePathname`, `CardHeader`/`CardAction`/`CardFooter`, `SLIDE_BRIDGE_TAG` alias; demote `MERMAID_FLOW_EDGE_PREFIX`; delete `src/types/`.
6. Fix the existing unused-variable warning so `--max-warnings=0` can be enabled.
7. **Gate:** `npm test`, `npm run check`, `npm run build`, `npm run blast-radius`; grep for deleted symbols returns only docs/comments.

## Phase 3 — Pure module moves and naming normalization (Track A)

1. Rename `src/lib/sanitize.ts` → `src/lib/json-redact.ts`; `sanitizeJson` → `redactJson`; update `app/json-sanitizer/page.tsx` and tests.
2. Normalize `src/lib/json.ts` exports: `jsToJSON` → `jsToJson`, `beautifyJSON` → `beautifyJson`, `minifyJSON` → `minifyJson`, `sortJSONValue` → `sortJsonValue`, `validateJSON` → `validateJson`, `parseJSLiteral` → `parseJsLiteral`; update all importers/tests. Keep function bodies unchanged.
3. Normalize `src/lib/csv.ts`: `parseCSV` → `parseCsv`, `jsonToCSV` → `jsonToCsv`, `CSVParseResult` → `CsvParseResult`; extend `parseCsv` with `{ dynamicTyping?: boolean; delimiter?: string; failOnError?: boolean }` whose defaults match today's lib behavior. Then migrate `components/converters/csv-to-json.tsx` with explicit options matching its current `Papa.parse` call and add a parity test. Delete `csvToJSON`.
4. Move `src/lib/tools.ts` icon components to `src/lib/tool-icons.tsx`; rename `navGroups`/`tools` → `NAV_GROUPS`/`TOOLS`; update homepage, sidebar, sitemap, redirects.
5. Move Mermaid/flow modules:
   - `diagrams.ts` → `src/lib/mermaid/render.ts` (keep the exact latch/config in Track A).
   - `mermaid-export.ts` → `src/lib/mermaid/export.ts`.
   - `mermaid-themes.ts` → `src/lib/mermaid/themes.ts`; remove `"use client"` only if verified pure.
   - `flow-graph.ts` → `src/lib/mermaid/graph.ts`.
   - `flow-graph-dom.ts` → `src/lib/mermaid/graph-dom.ts`.
   - `flow-simulation.ts` → `src/lib/mermaid/simulation.ts`.
   - Update `app/mermaid-diagram/page.tsx`, `components/notes/*`, and tests.
6. Split `src/lib/har.ts` into `src/lib/har/{types,classify,sensitive,insights,analyze,body,curl,filters,report,sample,index}.ts`:
   - Keep `har/index.ts` as the public barrel; update the 9 importers to `@/lib/har`.
   - Move `formatBytes`/`formatMs` to `src/lib/format.ts`; re-export from `har/index.ts` for one step, then update importers.
   - Move `ExplorerFilter`/`ExplorerHandoff`/`TimelineFilter` and `FILTER_TABS`/`FILTER_LABELS` to `har/filters.ts`; remove the component→component type import.
   - Keep all function bodies and labels byte-identical.
7. Normalize relative imports inside `src/lib/**` to include `.ts` (currently `flow-graph-dom.ts:10`, `notes/slides.ts:3-4`, `notes/exporters.ts:2-3`). Next/tsc accept this with `allowImportingTsExtensions`; Node tests require it.
8. Remove `"use client"` from genuinely pure modules (`notes/markdown.ts`, `mermaid/themes.ts`); keep it on DOM modules (`xml.ts`, `notes/slides.ts`, `notes/exporters.ts`, `notes/diagram-html.ts`, `mermaid/export.ts`, `mermaid/graph-dom.ts`).
9. **Gate:** contract export snapshots updated intentionally; tests/check/build/blast-radius green; no string/output changes.

## Phase 4 — Shared behavior consolidation (Track A)

1. `src/lib/clipboard.ts` + `src/hooks/use-copy-feedback.ts`: replace the 7 copies; preserve the 2-second reset and label-keyed variant; add timer cleanup (non-observable).
2. `src/lib/download.ts`: `saveTextFile`/`saveBlob` with explicit revoke delay per call site; replace the manual anchor in `har-analyzer`, `html-playground`, `svg-to-react`, and `mermaid/export`. Preserve filenames, MIME types, and revoke timings exactly.
3. `src/lib/bytes.ts`: `byteLength` uses the same `new Blob([text]).size` implementation; replace the 6 duplicates. Move `formatBytes`/`formatMs` to `lib/format.ts`; do not change other pages' ad-hoc display strings.
4. `src/lib/pagination.ts` + `src/components/har/pagination-bar.tsx`: exact function and JSX consolidation; `PAGE_SIZE` and noun remain props.
5. `src/lib/upload.ts`: `MAX_UPLOAD_MB` and `validateFile`; use in `editor-panel` and `file-upload` while preserving `window.alert` vs inline-message behavior. Do **not** add a new limit to Excel in Track A.
6. `src/hooks/use-auto-run.ts` and `src/hooks/use-debounced.ts`: extract the repeated `useEffect(() => { if (auto) run(); }, [...])` pattern one converter at a time; preserve exact dependencies and timings.
7. `src/lib/har/classify.ts`: one `classifyStatus(status, timeMs)` with the existing precedence (`0/4xx/5xx` error, `3xx` redirect, `>=1000ms` slow); use in request explorer/detail/timeline/overview with identical classes.
8. **Gate:** tests/check/build/blast-radius; manual smoke of each affected route; no DOM text/class changes.

## Phase 5 — Shell and component moves (Track A)

1. Move/rename:
   - `components/sidebar-layout.tsx` → `components/shell/app-shell.tsx`
   - `components/tool-page-layout.tsx` → `components/shell/tool-page.tsx`
   - `components/navigation.tsx`, `components/sidebar/nav-groups.tsx`, `components/logo.tsx`, `components/theme-*.tsx` → `components/shell/`
   - Extract `StatusMessage` → `components/status-message.tsx`; update 12 imports.
2. Move `src/app/markdown-preview/notes.css` → `src/components/notes/notes.css`; update the import.
3. Standardize every `app/*/layout.tsx` to `export default function Layout({ children })`; keep metadata explicit.
4. Rename converter symbols to `CsvToJsonPanel`, `JsonToCsvPanel`, `JsonToJsPanel`, `JsToJsonPanel`; rename files to `*-panel.tsx`; update `direction-tabs` and route imports.
5. Mermaid route: the request-simulation feature has been removed. The remaining page is the editor, theme picker, render, zoom/fullscreen preview, and export/copy path.
6. **Gate:** tests/check/build/blast-radius; manual smoke all 14 routes, especially Markdown, Mermaid, HAR, and both converter directions.

## Phase 6 — Route decomposition (Track A)

1. `app/har-analyzer/page.tsx`: move `sampleHar` → `lib/har/sample.ts`; `buildCsvReport`/`buildJsonReport` → `lib/har/report.ts`; `downloadBlob` → `lib/download.ts`; page becomes composition.
2. `app/html-playground/page.tsx`: move `CONSOLE_BRIDGE`, `PREVIEW_CSP`, `buildDocument` → `lib/html-playground.ts`; use the download helper; keep the exact CSP string and document output.
3. `app/svg-to-react/page.tsx`: move `SAFE_SVG_ELEMENTS` and `sanitizeSvgForPreview` → `lib/svg-sanitize.ts`; keep the exact current behavior, including the root-element bug (Track B fixes it).
4. `app/epoch-converter/page.tsx`: move date helpers → `lib/epoch.ts`; `ResultRow` → `components/epoch/result-row.tsx`; use the shared copy button.
5. `app/markdown-preview/page.tsx`: move TipTap extensions → `components/notes/extensions.ts`; `WELCOME_HTML` → `lib/notes/welcome-content.ts`; export dispatch → `hooks/use-note-export.ts`; preserve the exact export switch and error text.
6. `app/excel-to-csv/page.tsx`: reuse `FileUpload` with `readAs="arrayBuffer"`; remove the custom dropzone; pass an explicit `enforceSize={false}` in Track A so behavior is unchanged.
7. Converter panels: extract `ConverterShell` markup first; do **not** merge converter transforms or validation. Add `useConverter` only if per-converter parity tests cover every transition; otherwise stop and report.
8. **Gate:** tests/check/build/blast-radius; all routes render; exported HTML/CSV/DOCX text compared on fixtures.

## Phase 7 — HAR performance-neutral cleanup (output identical)

1. Memoize `filterCount` per tab and move the corpus cache to a ref/memo so render has no mutation; output identical.
2. Split `parseHar` and `analyzeEntries`; optionally defer analysis with `startTransition` (timing-only, explicitly approved).
3. Do **not** replace spread extrema or introduce a worker in Track A; those are correctness/performance fixes in Track C.
4. **Gate:** fixture output equality; tests/check/build; manual large-HAR smoke (same results, better responsiveness).

## Phase 8 — Track A final review

1. Run `npm run check`, `npm test`, `npm run test:coverage`, `npm run build`, `npm run blast-radius`.
2. Run `deslop` on `git diff main...HEAD`; remove only slop introduced by the refactor; re-run gates.
3. Re-run the security scan on the diff: no new `dangerouslySetInnerHTML`, `innerHTML`, `fetch`, `window.open`, `eval`, storage APIs, or remote URLs.
4. Produce a PR summary:
   - Moves/renames/deletions with old → new paths.
   - Proof of behavior neutrality: tests added, output fixtures, route count, build result.
   - Known deferred items (Track B/C) with IDs.
5. **STOP. Wait for explicit approval before Track B.**

---

# Track B — Security hardening (separate commits, each approved)

Each fix: add a failing regression test → apply the minimal fix → run Track A gates → document the behavior delta.

| ID | Fix | Behavior delta | Files |
|---|---|---|---|
| B1 | Sanitize the root `<svg>` element too: iterate `[root, ...root.querySelectorAll("*")]`; apply the same element/attribute policy to root; allow `xmlns`, `viewBox`, `width`, `height`, `fill`, etc. | Malicious root `onload`/`style`/`href` blocked; benign icons unchanged | `src/lib/svg-sanitize.ts` |
| B2 | Always shell-quote cURL args; validate method `/^[A-Z][A-Z-]*$/`; pass URL as a quoted argument; test argv with a local stub | Copied commands gain quotes; invalid methods rejected | `src/lib/har/curl.ts` |
| B3 | `escapeHtml(title)` in `buildDocument` `<title>` and both `<h1>` paths | Titles with `&`/`<` display correctly; no markup injection | `src/lib/notes/exporters.ts` |
| B4 | One Mermaid render owner: `renderMermaidSvg(code, config)` with no module latch; notes use `strict`; standalone route passes `getMermaidConfig(theme)`; no competing `initialize` | Route order no longer changes note rendering; HTML labels/links in diagrams may stop rendering | `lib/mermaid/render.ts`, `mermaid-diagram/page.tsx`, `notes/diagram-html.ts`, `notes/diagram-block.tsx` |
| B5 | Enforce `file.size > 10 MB` before `readAsArrayBuffer`; use `lib/upload.ts`; add cell/row bounds and cache the parsed workbook | Oversized workbooks are rejected as advertised; sheet switching avoids reparse | `app/excel-to-csv/page.tsx`, `components/file-upload.tsx`, `lib/upload.ts` |
| B6 | Replace app-origin blob Open with a trusted viewer route that embeds the code in a sandboxed iframe (or remove Open and keep Download) | “Open” no longer gives a standalone top-level page | `app/html-playground/page.tsx` + new viewer route |
| B7 | Correct the no-network claim; remove `allow-popups`/`allow-forms` from the preview sandbox where possible | Wording becomes accurate; popups/forms stop working | `app/html-playground/page.tsx` |
| B8 | Add a CSP meta to `buildDocument`; remove `allow-popups-to-escape-sandbox`; self-host or drop Google Fonts; document the remote-image policy | Remote fonts/images stop loading; editorial theme falls back | `lib/notes/exporters.ts`, `components/notes/note-preview.tsx`, `lib/notes/slides.ts` |
| B9 | Derive hide-all from the flag itself, not a snapshotted key list; add an explicit excluded-keys concept | New keys are redacted while hide-all is on; exclusion remains possible | `lib/json-redact.ts`, `app/json-sanitizer/page.tsx` |
| B10 | Dependency triage: migrate `xlsx@0.18.5` to a supported distribution (or `exceljs`), update Next/Mermaid/TipTap in tested batches, regenerate Monaco assets | Workbook output and renderer behavior may change; needs fixture comparisons and a separate PR | `package.json`, lockfile, `scripts/copy-monaco.mjs` |

**Track B exit:** every security finding has a regression test, a documented behavior delta, and a green build; `npm audit` is re-run and remaining advisories have an owner/expiry note. B10 may land as a follow-up PR if output differences require soak time.

---

# Track C — Correctness backlog (separate approval, not this branch)

C1–C10 from §1.10. Each item needs a failing regression test, a product decision about the expected behavior, and its own PR. Do not fold these into Track A.

---

# 4. Verification and blast-radius gates

Run after every phase:

```bash
npm run check          # tsc --noEmit + eslint --max-warnings=0
npm test               # node --test "tests/**/*.test.ts"
npm run test:coverage  # built-in coverage
npm run build          # production build; prerenders every route
npm run blast-radius -- --base main
```

Additional checks:

- `git diff --stat main...HEAD` and `git diff main...HEAD -- src` reviewed before every commit.
- `git grep` for every deleted/renamed symbol returns zero source hits.
- Route count: homepage + 14 tool URLs; `next build` reports all prerendered.
- Output parity: fixture-based comparisons for CSV, JSON, HTML export, DOCX input, cURL argv, HAR reports.
- Security scan on the diff: `dangerouslySetInnerHTML`, `.innerHTML`, `srcdoc`, `window.open`, `URL.createObjectURL`, `eval(`, `new Function`, `fetch(`, `localStorage`, `sessionStorage`, `indexedDB`.
- Manual smoke: homepage, all 14 tools, both converter directions, Markdown source/rich toggle, Mermaid render/export/zoom, HAR import/export, playground preview/Open, SVG preview/sanitize, Excel import/sheet switch.

---

# 5. Deliverables

- `docs/audit.md` — current-HEAD findings, fixed/partial/present status, evidence paths, Track A/B/C classification.
- `docs/plan.md` — target structure, naming rules, dependency rules, ordered phases, gates, security deltas, backlog.
- `scripts/blast-radius.mjs` — dependency graph, cycle/boundary checks, changed-file dependents.
- `tests/contract/*` and `tests/lib/*` — characterization and architecture guards.
- Branch `refactor/codebase-overhaul` with small, reviewable commits.
- Track A PR summary proving behavior neutrality.
- Track B security PR(s) with explicit behavior deltas.

---

# 6. Risks and rollback

| Risk | Mitigation |
|---|---|
| A move silently changes output | Characterization tests first; export-surface snapshots; fixture output comparisons; `next build` |
| Renaming public symbols breaks an importer | Contract test + `tsc --noEmit` + `git grep`; rename in a dedicated commit |
| HAR split introduces cycles | Dependency rules in `blast-radius`; pure modules first; barrel preserves imports |
| Mermaid simulation removal changes the tool's scope | The feature was removed at the user's request; editor/render/export/zoom behavior is unchanged |
| CSV consolidation changes `dynamicTyping`/delimiter behavior | Explicit options matching the current component call; parity tests; otherwise keep the component's parser and delete only the dead helper |
| UI extraction changes markup | Keep JSX copy-paste identical; manual route smoke; split into small commits; stop and report on any visual diff |
| Track B security fix changes legitimate behavior | Separate commit per fix; failing regression first; written behavior delta; user approval |
| Dirty baseline contaminates refactor | Baseline commit first; all refactor commits start from a clean tree |
| Documentation is hidden by `.gitignore` | Fix `*.md` before writing docs; verify `git status` shows them |

**Rollback:** each phase is a separate commit series on `refactor/codebase-overhaul`; revert the phase commit or reset the branch to the baseline commit. `main` is never modified. Do not use `git reset --hard` on a dirty tree; stash or revert explicitly.
