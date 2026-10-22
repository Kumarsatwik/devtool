# Codebase Audit — Current Working Tree

> **Status: Audit complete. No source behavior changed.**
> **Branch:** `refactor/codebase-overhaul`
> **Baseline:** `1d22579` (includes the Mermaid flow work previously staged)
> **Date:** 2026-10-21

> This document is the current-HEAD audit. The target design and ordered migration plan are in [`docs/plan.md`](./plan.md). The older `CODEBASE_REVIEW.md` is historical.

> **Feature update (2026-10-21):** The Mermaid request-simulation feature was removed at the user's request. Findings that reference `lib/mermaid/simulation.ts`, `graph.ts`, `graph-dom.ts`, or the simulation controls are historical.

> **Implementation update (2026-10-21):** Track B security items B1–B10 are implemented on `refactor/codebase-overhaul`. See [`docs/pr-summary.md`](./pr-summary.md) for the verification record and behavior deltas.

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

# Part I — Audit (current working tree)

## 1.1 Snapshot

- ~93 source files, ~18,400 lines under `src/`; 24 modules in `src/lib/` (~5,540 lines).
- 14 tool routes + homepage; 14 route layouts.
- 4 test files / 13 tests / 127 lines. Only 4 of 24 lib modules have any test; only `split.ts` is genuinely covered.
- `refactor/codebase-overhaul` is clean at `1d22579`; `main` is at the same baseline commit. The Mermaid flow work previously staged is now committed.
- Existing `CODEBASE_REVIEW.md` reviewed revision `6322e8d`; several findings are already fixed, several remain, and some new ones were found.

## 1.2 Security findings (verified on current tree)

| ID | Status | Finding | Evidence | Track |
|---|---|---|---|---|
| S1 | **FIXED** | SVG preview sanitizer never inspects the **root `<svg>` element**; `onload`, `style`, `href` on the root survive and are inserted via `dangerouslySetInnerHTML` | `src/app/svg-to-react/page.tsx:453` (only descendants); sink `:322-326`; sanitizer `:441-489` | B1 |
| S2 | **FIXED** | Playground **Open** creates an app-origin `blob:` URL and opens it top-level; `noopener` does not revoke origin/storage access | `src/app/html-playground/page.tsx:273-278` | B6 |
| S3 | **FIXED** | Playground CSP does not block **self-navigation**; UI claims “All network access is blocked” | CSP `src/app/html-playground/page.tsx:151-161`; claim `:297`; sandbox `:486` | B7 |
| S4 | **FIXED** | cURL builder whitelists `&`, `?`, `#` unquoted and interpolates the HTTP method raw; shell injection from an untrusted HAR is possible | `src/lib/har.ts:905-937` | B2 |
| S5 | **FIXED** | Export document `<title>` and both `<h1>` interpolations are unescaped | `src/lib/notes/exporters.ts:51,436,508` | B3 |
| S6 | **FIXED** | Excel route advertises a 10 MB limit but only checks the extension before reading; sync `XLSX.read` on the main thread | `src/app/excel-to-csv/page.tsx:71-102`, claim `:226` | B5 |
| S7 | **FIXED** | Notes pipeline initializes Mermaid with `securityLevel: "loose"` and writes the returned SVG into the app DOM; competing config owners are order-dependent | `src/lib/diagrams.ts:12`; `src/app/mermaid-diagram/page.tsx:463-468`; `src/lib/mermaid-themes.ts:150` | B4 |
| S8 | **FIXED** | Note preview/export documents have no CSP; `serif` theme injects Google Fonts; imported Markdown can auto-fetch remote images; `allow-popups-to-escape-sandbox` is unnecessarily broad | `src/lib/notes/exporters.ts:41-58,261-265`; `src/components/notes/note-preview.tsx:306`; `src/lib/notes/markdown.ts:25-30` | B8 |
| S9 | **FIXED (production)** | Dependencies updated: Next 16.4.2, Mermaid 12.2.0, TipTap 3.32, Base UI 1.9, Monaco 0.57, SheetJS 0.20.3. Production audit is clean; dev-only ESLint/Monaco advisories remain. | `package.json` | B10 |
| S10 | **FIXED** | PlantUML remote rendering removed; no `fetch`/XHR/WebSocket/sendBeacon anywhere in `src` | — | — |
| S11 | **FIXED** | Hide-all redacts every leaf by default and exposes only explicit `excludedKeys`; keys added after the toggle is enabled stay hidden. | `src/lib/json-redact.ts`; `tests/lib/json-redact.test.ts` | B9 |

**Other sinks checked:** no `eval`, `new Function`, `localStorage`, `sessionStorage`, or `indexedDB` in `src`. Mermaid SVG is inserted in three places (`notes/diagram-html.ts`, `notes/diagram-block.tsx`) and now renders with strict security and the note-document CSP.

## 1.3 Dead code (safe to remove)

| ID | Item | Evidence | Action |
|---|---|---|---|
| D1 | Old Markdown export module | `src/lib/markdown-export.ts:1-144`; zero importers | Delete |
| D2 | Superseded flow timeline module and dead trace half | `src/lib/flow-timeline.ts:1-208`; `buildFlowTrace`/`FlowTrace`/`FlowHop`/`MAX_TRACE_HOPS` in `src/lib/flow-graph.ts:24,60-75,172-218`; zero consumers | Delete module; remove dead exports |
| D3 | No-op diagram abstraction + tautological test | `src/lib/diagrams.ts:20-26`; `tests/diagrams.test.ts:4-8` asserts the default argument | Collapse to `renderMermaidSvg`; replace test with a real config/pure test |
| D4 | Unused CSV helper | `src/lib/csv.ts:3,23-26` (`CSVParseResult`, `csvToJSON`); `csv-to-json.tsx:33-49` calls `Papa.parse` directly | Delete helper after parity tests; reuse `parseCsv` |
| D5 | Unused type guard | `src/lib/mermaid-themes.ts:117-119` (`isDiagramTheme`) | Delete or use; prefer delete |
| D6 | Dead navigation variable | `src/components/navigation.tsx:10` (`isHomepage`, `usePathname`) | Delete both |
| D7 | Unused shadcn exports | `src/components/ui/card.tsx` (`CardHeader`, `CardAction`, `CardFooter`) | Delete after import check |
| D8 | Pointless alias | `src/lib/notes/slides.ts:733` (`SLIDE_BRIDGE_TAG = DECK_BRIDGE_TAG`) | Export `DECK_BRIDGE_TAG` directly |
| D9 | Empty directory | `src/types/` | Delete; do not recreate |
| D10 | Committed/local junk | `src/app/mermaid-diagram/# AI Document Formatting for CKEditor 5:.md.md`; `src/app/.DS_Store`; root `.DS_Store`; empty `src/app/{json-formatter,rich-text-formatter,interview-plan}` | Remove; fix `.gitignore` |
| D11 | Unnecessary public constant | `src/lib/flow-graph.ts:21` (`MERMAID_FLOW_EDGE_PREFIX`) | Demote to module-local |

## 1.4 Misplaced domain logic

| ID | Problem | Evidence | Target |
|---|---|---|---|
| M1 | `har.ts` mixes wire types, classification, sensitive scanning, analysis, prose, formatting, body decoding, and cURL | `src/lib/har.ts` (937 lines) | `src/lib/har/*` (see §2.1) |
| M2 | 1,443-line Mermaid route owns reducers, rAF playback, zoom/pan, config editors, export logic | `src/app/mermaid-diagram/page.tsx` | `components/mermaid/*`, `hooks/*`, `lib/mermaid/playback.ts` |
| M3 | HAR route owns a 190-line sample fixture, report builders, and a download helper | `src/app/har-analyzer/page.tsx:26-214,245-337` | `lib/har/sample.ts`, `lib/har/report.ts`, `lib/download.ts` |
| M4 | Playground route owns console bridge, CSP, document assembly | `src/app/html-playground/page.tsx:107-194` | `src/lib/html-playground.ts` |
| M5 | SVG security sanitizer lives after the page component | `src/app/svg-to-react/page.tsx:389-489` | `src/lib/svg-sanitize.ts` |
| M6 | Epoch route owns date helpers and two components | `src/app/epoch-converter/page.tsx:12-54,218-229` | `lib/epoch.ts`, `components/epoch/result-row.tsx`, shared copy button |
| M7 | `jsonToJS` is a pure converter inside a component; its mirror `jsToJSON` is in `lib/json.ts` | `src/components/converters/json-to-js.tsx:24-66` | `src/lib/json.ts` |
| M8 | Filter/handoff types are owned by a component and imported across component boundaries | `src/components/har/request-explorer.tsx:15-33`; imported by `overview.tsx:22` and `har-analyzer/page.tsx:13` | `src/lib/har/filters.ts` |
| M9 | `StatusMessage` is exported from the page layout but imported by 12 files | `src/components/tool-page-layout.tsx:35-56` | `src/components/status-message.tsx` |
| M10 | Shared notes stylesheet lives in a route | `src/app/markdown-preview/notes.css` (555 lines) | `src/components/notes/notes.css` |
| M11 | Two names for the page frame | `sidebar-layout.tsx` vs `tool-page-layout.tsx` | `components/shell/app-shell.tsx` + `tool-page.tsx` |
| M12 | 14 boilerplate layouts with mixed function names | `src/app/*/layout.tsx` | Standardize `Layout`; keep metadata explicit |

## 1.5 Duplication ledger

| ID | Pattern | Occurrences | Target |
|---|---|---|---|
| U1 | Pagination function + 49-line JSX blocks | `har/domains-view.tsx:9-20,94-142`; `har/request-explorer.tsx:52-63,437-485` | `lib/pagination.ts` + `components/har/pagination-bar.tsx` |
| U2 | Clipboard copy + 2s “Copied” flash | 7 sites: `editor-panel`, `har/request-detail`, `har/body-viewer`, `epoch-converter`, `html-playground`, `svg-to-react`, `mermaid-diagram` | `lib/clipboard.ts` + `hooks/use-copy-feedback.ts` |
| U3 | Download/save implementations | 3 mechanisms: manual anchor+revoke, `file-saver`, `mermaid-export` | `lib/download.ts` with explicit revoke behavior per call |
| U4 | UTF-8 byte counting via `new Blob` | 6 sites | `lib/bytes.ts` (`byteLength` keeps the exact implementation) |
| U5 | CSV serializers | `har-analyzer/page.tsx:245-282` vs `lib/csv.ts:28-56` | `lib/har/report.ts` using `lib/csv` after byte-parity tests |
| U6 | Converter screen skeleton | 9 pages/components (~1,100 lines) | `components/converters/converter-shell.tsx` + `hooks/use-auto-run.ts`; do not merge transforms |
| U7 | Route layouts | 14 files, 158 lines | 3-line explicit layouts with `Layout` name |
| U8 | Upload limits | `editor-panel.tsx:18`, `file-upload.tsx:18`, `excel-to-csv/page.tsx:226` | `lib/upload.ts` |
| U9 | Sample JSON/JS/XML payloads | 5+ divergent copies | `lib/samples.ts` with each existing payload preserved as its own constant |
| U10 | HAR status classification | `request-explorer`, `request-detail`, `timeline`, `overview`, `har.ts` | `lib/har/classify.ts` with exact precedence |
| U11 | Sensitive key/value scanning | 3 loops in `har.ts:241-246,280-293,317-319` | One `scanKeyValue` helper |

## 1.6 Naming inconsistencies

| Issue | Evidence | Rule |
|---|---|---|
| Acronym casing split | `JSONToJSPage` vs `XmlToJsonLayout`; `CSVParseResult` vs `SvgToReactOptions`; `jsToJSON` vs `xmlToJson` | Acronyms as words: `JsonToJsPanel`, `CsvParseResult`, `jsToJson` |
| Non-route `*Page` components | `JSONToJSPage`, `JSToJSONPage`, `CSVToJSONPage`, `JSONToCSVPage` under `components/converters/` | Use `*Panel`/`*View`; only `app/**/page.tsx` is a page |
| File ≠ symbol ≠ route | `components/converters/json-to-js.tsx` → `JSONToJSPage` → route `/json-js-converter` | `JsonToJsPanel` in `json-to-js-panel.tsx` |
| Constants camel vs shouty | `sampleJSON`, `navGroups`, `exportOptions` vs `SAMPLE_HTML`, `PREVIEW_CSP` | `SAMPLE_JSON`, `NAV_GROUPS`, `EXPORT_OPTIONS` |
| `sanitize` overloaded | JSON redaction (`lib/sanitize.ts`) vs SVG DOM filter (`sanitizeSvgForPreview`) | `json-redact.ts` / `redactJson`; `svg-sanitize.ts` |
| `"diagram"` overloaded | 6 modules/features use the word | `lib/mermaid/*` and `components/notes/diagram-node.tsx` |
| One-file folder vs flat sibling | `components/sidebar/nav-groups.tsx` vs `sidebar-layout.tsx` | `components/shell/` |
| Misplaced widget export | `StatusMessage` in `tool-page-layout.tsx` | `components/status-message.tsx` |
| Wrong font variable | `JetBrains_Mono` stored as `--font-geist-mono` | `--font-jetbrains-mono` |
| Stale heading | `sidebar-layout.tsx:109-111` renders “Data Utilities”; no such nav group | Delete |

## 1.7 AI-slop findings

| ID | Pattern | Evidence |
|---|---|---|
| A1 | Comments claim behavior that does not exist | `flow-timeline.ts:4,8` cites a nonexistent test and a removed tab; `html-playground/page.tsx:102-106` says “no backticks” next to a template literal; changelog comments in `mermaid-diagram/page.tsx:124-129,176-178` |
| A2 | Reassuring name, no implementation | `detectDiagramKind` returns its own `fallback`; `renderDiagramSvg` ignores `_kind` |
| A3 | Tautological test | `tests/diagrams.test.ts` asserts the no-op |
| A4 | Ignored parameters kept as API | `_kind`, `_code` in `diagrams.ts` |
| A5 | Inconsistent error handling | `window.alert` (`editor-panel`, `markdown-preview`), `StatusMessage` (12 routes), silent `catch {}` (`epoch-converter`, `request-detail`, `body-viewer`, `slides.ts`) |
| A6 | Embedded application inside a string | `notes/slides.ts` ~600 lines of CSS/JS strings (`:81-152`, `:156-380`, `:389-730`) |
| A7 | Silent catches | `slides.ts:442,450,479,634` |
| A8 | Render-phase state updates | `sidebar-layout.tsx:22-28`; `request-explorer.tsx:143-149` mutates a `Map` during render |
| A9 | Stale product claims | `README.md:21-23` claims JSON diff/parser tests that do not exist; `CODEBASE_REVIEW.md:56` says four tests cover diagrams (13 tests across 4 files) |
| A10 | Disabled lint rule masks effect patterns | `eslint.config.mjs:10` disables `react-hooks/set-state-in-effect` repo-wide |

## 1.8 Architecture and state findings

| ID | Finding | Evidence |
|---|---|---|
| L1 | Markdown debounce timer is never cleared on unmount; blur can discard the last 500 ms of typing; file import can leave the source pane on the previous document | `components/notes/markdown-pane.tsx:18,35-37,49-52`; `app/markdown-preview/page.tsx:85-100` |
| L2 | Converters keep stale output after an invalid input | `components/converters/csv-to-json.tsx:51-62`; `json-to-csv.tsx:52-76` |
| L3 | JSON validator parses a stale error against the current input | `app/json-validator/page.tsx:50-67` |
| L4 | HAR analysis and filtering are synchronous; `filterCount` re-filters the full list once per tab on every render; corpus cache is mutated during render | `app/har-analyzer/page.tsx:349`; `components/har/request-explorer.tsx:143-149,198-199` |
| L5 | Mermaid global config has three competing owners; route order can change note rendering | `lib/diagrams.ts:6-19`; `app/mermaid-diagram/page.tsx:463-468`; `notes/diagram-html.ts:63-66` |
| L6 | Dependency direction is mostly clean (`lib` never imports `components`/`app`); sole violation is `overview.tsx:22` importing a type from `request-explorer.tsx` | — |
| L7 | `xml.ts` uses `DOMParser` with no client boundary; safe only by import discipline | `src/lib/xml.ts:23` |

## 1.9 Tests and tooling

| ID | Finding | Evidence |
|---|---|---|
| T1 | 4 test files / 13 cases; 4/24 lib modules touched; 3,209 pure lines with zero tests (`json`, `har`, `csv`, `flow-*`, `svg-to-react`, `slides`, `exporters`) | `tests/*.test.ts` |
| T2 | `node --test tests/*.test.ts` is non-recursive; moving tests into subfolders silently skips them | `package.json:13` |
| T3 | CI does not run `npm run build`; `copy-monaco.mjs` is never exercised | `.github/workflows/check.yml` |
| T4 | `eslint .` exits 0 on warnings; no `--max-warnings=0` | `package.json:12` |
| T5 | No `engines`/`.nvmrc`; CI Node 24, `@types/node` 20; type stripping assumes Node ≥22.18 | `package.json`, CI |
| T6 | `*.md` in `.gitignore` hides every new doc; `codedb.snapshot` and `exports/` are unignored | `.gitignore` last lines |
| T7 | `tsconfig` lacks `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `exactOptionalPropertyTypes`; `target: ES2017` is stale | `tsconfig.json` |
| T8 | No Prettier/Biome/editorconfig; generated shadcn files use a different semicolon style | `components/ui/*` |
| T9 | `scripts/copy-monaco.mjs` reads `node_modules` before its existence guard; no stale-file cleanup on version change | `scripts/copy-monaco.mjs` |
| T10 | CI/lint do not check import boundaries or route/catalog consistency | — |

## 1.10 Correctness backlog (Track C — documented, not executed)

These are real defects but would change output and need separate product decisions:

- C1 JSON-to-JS string/key escaping and special-key semantics (`json-to-js` page).
- C2 Numeric precision loss in JSON parse/stringify (`lib/json.ts`).
- C3 CSV serialization drops later-only columns; mixed rows unvalidated (`lib/csv.ts`, `json-to-csv`).
- C4 Regex-based SVG→JSX conversion defects (attribute casing, style objects, text braces, forwardRef exports, dimensions/title).
- C5 HAR validation rejects whole archives on one bad field; spread-extrema stack overflow; transfer-byte semantics; 304 classified as redirect; origin/suffix checks.
- C6 Markdown `==` preprocessing corrupts code fences; debounce lifecycle (L1).
- C7 Stale result/diagnostic revisions in converters and sanitizer (L2/L3).
- C8 Keyboard/focus gaps in dropzones, drawers, and mobile navigation.
- C9 Catalog claims that exceed implemented capabilities (PDF export, comparison path summary).
- C10 Large-HAR performance (worker/off-thread) and Excel expanded-content limits.

---
