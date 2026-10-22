/* HAR (HTTP Archive) parsing and analysis helpers.
   All processing is client-side; nothing leaves the browser. */

export type {
  AnalyzedEntry,
  DomainStat,
  EntryIssue,
  HarAnalysis,
  HarCookie,
  HarEntry,
  HarLog,
  HarNameValue,
  IssueKind,
  RequestCategory,
  SensitiveFinding,
} from "./har/types.ts";

export { CATEGORY_META, baseDomain } from "./har/classify.ts";
export {
  SENSITIVE_HEADER,
  SENSITIVE_KEY,
  maskValue,
  isSensitiveHeader,
} from "./har/sensitive.ts";
export { buildCurl } from "./har/curl.ts";
export {
  BODY_PREVIEW_LIMIT,
  decodeBody,
  formatBytes,
  formatMs,
  isBinaryBody,
  prettyBody,
} from "./har/body.ts";
export { explainEntry, TIMING_PHASES } from "./har/insights.ts";
export { analyzeHar, headerValue, parseHar } from "./har/analyze.ts";
