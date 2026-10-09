export interface ToolRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * Legacy converter routes and the tabbed direction they point at.
 * Shared by the Next config and the unit tests.
 */
export const toolRedirects: ToolRedirect[] = [
  { source: "/csv-to-json", destination: "/csv-json-converter?dir=csv", permanent: true },
  { source: "/json-to-csv", destination: "/csv-json-converter?dir=json", permanent: true },
  { source: "/json-to-js", destination: "/json-js-converter?dir=json", permanent: true },
  { source: "/js-to-json", destination: "/json-js-converter?dir=js", permanent: true },
];
