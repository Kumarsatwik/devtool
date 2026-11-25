export interface PdfLayoutOptions {
  lineSpacing: number;
  paragraphSpacing: number;
  margin: number;
  padding: number;
}

export const DEFAULT_PDF_LAYOUT: Readonly<PdfLayoutOptions> = {
  lineSpacing: 1.6,
  paragraphSpacing: 11,
  margin: 16,
  padding: 0,
};

export const PDF_LAYOUT_LIMITS = {
  lineSpacing: { min: 1, max: 3, step: 0.1 },
  paragraphSpacing: { min: 0, max: 36, step: 1 },
  margin: { min: 0, max: 40, step: 1 },
  padding: { min: 0, max: 20, step: 1 },
} as const;

const A4_HEIGHT_MM = 297;
const MAX_IMAGE_HEIGHT_MM = 240;
const IMAGE_SPACING_MM = 16;

export function buildPdfCss(
  options: PdfLayoutOptions = DEFAULT_PDF_LAYOUT,
): string {
  for (const key of Object.keys(PDF_LAYOUT_LIMITS) as
    (keyof PdfLayoutOptions)[]) {
    const { min, max } = PDF_LAYOUT_LIMITS[key];
    if (
      !Number.isFinite(options[key]) ||
      options[key] < min ||
      options[key] > max
    ) {
      throw new Error(`PDF ${key} must be between ${min} and ${max}.`);
    }
  }
  // Include padding in the page inset so it repeats across page breaks.
  const inset = options.margin + options.padding;
  const imageHeight = Math.min(
    MAX_IMAGE_HEIGHT_MM,
    A4_HEIGHT_MM - inset * 2 - IMAGE_SPACING_MM,
  );
  return `
  @page { size: A4; margin: ${inset}mm; }
  * { box-sizing: border-box; }
  html, body {
    width: auto;
    max-width: none;
    margin: 0;
    padding: 0;
    background: white;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  body {
    font-size: 11pt;
    overflow-wrap: anywhere;
    line-height: ${options.lineSpacing};
  }
  p { margin-top: 0; margin-bottom: ${options.paragraphSpacing}pt; }
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid;
    page-break-after: avoid;
    line-height: 1.3;
  }
  p, li { orphans: 3; widows: 3; }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    overflow: visible;
    break-inside: auto;
  }
  pre code { white-space: inherit; }
  img, svg {
    max-width: 100% !important;
    max-height: ${imageHeight}mm;
    object-fit: contain;
    break-inside: avoid;
  }
  .mermaid-diagram { break-inside: avoid; }
  table {
    table-layout: fixed;
    width: 100% !important;
    min-width: 0 !important;
    break-inside: auto;
  }
  col { width: auto !important; }
  th, td {
    min-width: 0 !important;
    overflow-wrap: anywhere;
    white-space: normal;
  }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  ul[data-type="taskList"] li { display: block; position: relative; }
  ul[data-type="taskList"] li > label {
    position: absolute;
    left: 0;
  }
  ul[data-type="taskList"] li > div { margin-left: 1.5em; }
`;
}

const PDF_LOAD_TIMEOUT_MS = 30_000;

/** Use browser pagination to keep text and links native in the PDF. */
export async function printPdfDocument(html: string): Promise<void> {
  const frame = document.createElement("iframe");
  frame.title = "PDF export";
  frame.setAttribute("sandbox", "allow-same-origin allow-modals");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  // A laid-out frame is needed for fonts and images, but not on-screen.
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:178mm;height:265mm;border:0;";

  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const cleanup = () => {
    clearTimeout(loadTimer);
    frame.remove();
    previouslyFocused?.focus();
  };

  try {
    await Promise.race([
      new Promise<never>((_, reject) => {
        loadTimer = setTimeout(() => {
          reject(new Error("PDF preparation timed out. Check note images."));
        }, PDF_LOAD_TIMEOUT_MS);
      }),
      new Promise<void>((resolve, reject) => {
        frame.onload = () => {
          const doc = frame.contentDocument;
          if (!doc) {
            reject(new Error("Could not open the PDF export document."));
            return;
          }
          Promise.all([
            doc.fonts.ready,
            ...Array.from(doc.images, async (image) => {
              try {
                await image.decode();
              } catch {
                throw new Error(
                  "An image could not be loaded for PDF export. " +
                    "Remove or replace the broken image and try again.",
                );
              }
            }),
          ]).then(() => resolve(), reject);
        };
        frame.srcdoc = html;
        document.body.appendChild(frame);
      }),
    ]);
    clearTimeout(loadTimer);
    const printWindow = frame.contentWindow;
    if (!printWindow) throw new Error("PDF export window is unavailable.");
    // Some browsers return from print() before the dialog closes.
    await new Promise<void>((resolve, reject) => {
      printWindow.addEventListener("afterprint", () => resolve(), {
        once: true,
      });
      try {
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        reject(error);
      }
    });
  } finally {
    cleanup();
  }
}
