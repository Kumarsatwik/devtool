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
} from "./types.ts";

export { CATEGORY_META, baseDomain } from "./classify.ts";
export {
  SENSITIVE_HEADER,
  SENSITIVE_KEY,
  maskValue,
  isSensitiveHeader,
} from "./sensitive.ts";
export { buildCurl } from "./curl.ts";
export {
  BODY_PREVIEW_LIMIT,
  decodeBody,
  isBinaryBody,
  prettyBody,
} from "./body.ts";
export { formatBytes, formatMs } from "../format.ts";
export { explainEntry, TIMING_PHASES } from "./insights.ts";
export { analyzeHar, headerValue, parseHar } from "./analyze.ts";
