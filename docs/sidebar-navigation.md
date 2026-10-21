# Sidebar Navigation

## Navigation Map

`src/lib/tools.ts` owns `navGroups`. Its derived `tools` array feeds the homepage
search and sitemap, so each tool is registered once.

| Group | Workspaces |
| --- | --- |
| File Converters — translate one file format into another | CSV / JSON, Excel to CSV, XML to JSON, JSON / JS, SVG to React |
| JSON Utilities — format, validate, compare, and clean JSON | Beautifier, Validator, Compare, Sanitizer |
| Preview & Notes — write markup and preview the rendered result | HTML Playground, Mermaid Diagram, Markdown Notes |
| Inspect & Debug — analyze network captures and timestamps | HAR Analyzer, Epoch Converter |

Ordering is a product hypothesis, not a measured traffic ranking.

## Sidebar Contract

Desktop renders Base UI collapsible groups. Groups initially open; a route
change reopens the destination group, after which manual collapse takes priority.
State is shared between desktop and mobile within the current sidebar mount.
All state is in memory and resets on refresh or sidebar unmount.

Desktop group headers expose the group purpose as a tooltip; tool links nest under a rail indent and the group holding the current route keeps a foreground header. Mobile renders the same grouped tool links without collapse controls inside a
Base UI modal dialog. The dialog manages focus containment, Escape dismissal,
and focus restoration. Selecting a link closes it; crossing the desktop
breakpoint closes it as well. Both navigation surfaces scroll vertically.

Use native links with `aria-current="page"` and disclosure buttons with standard
Tab/Enter/Space behavior. Do not add menu/tree keyboard semantics to ordinary
navigation. Focus rings remain visible and decorative icons are hidden from
assistive technology. Chevron motion respects reduced-motion preferences.
Panels have no height animation, avoiding animation-driven layout measurements.

## Converter Merges and Routes

The canonical routes are `/csv-json-converter` and `/json-js-converter`.
Direction tabs share one page shell and keep each direction's editor state
mounted in memory. Existing options, manual/live conversion, downloads, file
imports, and CSV raw/grid previews remain separate per direction.

| Old route | Permanent destination |
| --- | --- |
| `/csv-to-json` | `/csv-json-converter?dir=csv` |
| `/json-to-csv` | `/csv-json-converter?dir=json` |
| `/json-to-js` | `/json-js-converter?dir=json` |
| `/js-to-json` | `/json-js-converter?dir=js` |

Redirects are configured in `next.config.ts`; legacy routes are not catalog or
sitemap entries. The sitemap contains 14 tool URLs plus the homepage.
Merged route layouts use canonical metadata without direction query strings.
Direction changes use Next-integrated native history updates and support
Back/Forward. Missing or unsupported directions select the first tab.
Never encode editor content or filenames in the URL.

## Scope and Privacy

There is no authentication, permissions API, or analytics backend. This change
adds none. Their absence does not imply that authentication is inherently
incompatible with local processing. If permissions are introduced, enforce
authorization at the protected route/data boundary, not merely in navigation.

Do not persist sidebar preferences or experiments in localStorage,
sessionStorage, IndexedDB, or browser caches. No payloads or navigation telemetry
are collected. A grouped/flat experiment toggle is intentionally omitted: an
unmeasured toggle is not an A/B test.

## Validation and Monitoring

Run `npm test`, `npm run check`, and `npm run build`. Navigation unit tests guard
unique registration, route coverage, canonical metadata, and legacy redirects.
Browser tests should cover desktop group controls, active links, mobile modal
focus/Escape behavior, narrow widths, both converter directions, editor state
retention, URL history, catalog filtering, redirects, and sitemap contents.

Before broad rollout, conduct observed tasks with representative users:
convert CSV to JSON and back, sanitize JSON, inspect a HAR, author notes, and
convert a timestamp. Compare navigation time, wrong destinations, backtracking,
task completion, and perceived ease against an observed old-navigation baseline.
Targets of 15% less navigation time and 10% fewer navigation support questions
require that baseline and a consistent support categorization process.
No measured improvement is claimed by this implementation.

Review anonymized support feedback and repeat usability sessions weekly during
the first month, then monthly. Keep unrelated security and converter fidelity
work separate from navigation rollout; route merging is not a claim that all
existing tool defects are resolved.
