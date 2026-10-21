export interface HarNameValue {
  name: string;
  value: string;
}

export interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface HarEntry {
  startedDateTime?: string;
  time?: number;
  serverIPAddress?: string;
  connection?: string;
  pageref?: string;
  cache?: Record<string, unknown>;
  request: {
    method: string;
    url: string;
    httpVersion?: string;
    headers?: HarNameValue[];
    queryString?: HarNameValue[];
    cookies?: HarCookie[];
    postData?: {
      mimeType?: string;
      text?: string;
      params?: HarNameValue[];
    };
    headersSize?: number;
    bodySize?: number;
  };
  response: {
    status: number;
    statusText?: string;
    httpVersion?: string;
    headers?: HarNameValue[];
    cookies?: HarCookie[];
    content?: {
      size?: number;
      mimeType?: string;
      text?: string;
      encoding?: string;
    };
    redirectURL?: string;
    headersSize?: number;
    bodySize?: number;
    _transferSize?: number;
  };
  timings?: {
    blocked?: number;
    dns?: number;
    connect?: number;
    ssl?: number;
    send?: number;
    wait?: number;
    receive?: number;
  };
}

export interface HarLog {
  log?: {
    version?: string;
    creator?: { name?: string; version?: string };
    browser?: { name?: string; version?: string };
    entries?: HarEntry[];
    pages?: { title?: string; startedDateTime?: string }[];
  };
}

export type RequestCategory =
  | "page"
  | "api"
  | "auth"
  | "image"
  | "js"
  | "css"
  | "font"
  | "data"
  | "analytics"
  | "other";

export interface SensitiveFinding {
  where: string;
  name: string;
  value: string;
  reason: string;
}

export type IssueKind =
  | "error"
  | "cors"
  | "auth"
  | "redirect"
  | "slow"
  | "large";

export interface EntryIssue {
  kind: IssueKind;
  label: string;
  detail: string;
}

export interface AnalyzedEntry {
  index: number;
  method: string;
  url: string;
  host: string;
  path: string;
  status: number;
  statusText: string;
  mimeType: string;
  category: RequestCategory;
  isThirdParty: boolean;
  timeMs: number;
  sizeBytes: number;
  startedDateTime: string;
  startMs: number;
  issues: EntryIssue[];
  sensitive: SensitiveFinding[];
  queryParams: HarNameValue[];
  reqCookies: HarCookie[];
  resCookies: HarCookie[];
  raw: HarEntry;
}

export interface DomainStat {
  host: string;
  count: number;
  sizeBytes: number;
  thirdParty: boolean;
}

export interface HarAnalysis {
  entries: AnalyzedEntry[];
  creator: string;
  firstPartyHost: string;
  totalRequests: number;
  totalSizeBytes: number;
  totalTimeMs: number;
  errorCount: number;
  errors4xx: number;
  errors5xx: number;
  failedCount: number;
  corsCount: number;
  authCount: number;
  redirectCount: number;
  slowCount: number;
  largeCount: number;
  thirdPartyCount: number;
  sensitiveRequestCount: number;
  uniqueHosts: number;
  categoryCounts: Record<RequestCategory, number>;
  domains: DomainStat[];
  slowest: AnalyzedEntry | null;
  largest: AnalyzedEntry | null;
  ttfbMedianMs: number | null;
  lcpHeuristicMs: number | null;
  lcpHeuristicEntry: AnalyzedEntry | null;
}
