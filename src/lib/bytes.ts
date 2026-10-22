/** UTF-8 byte length of a string, using the same Blob-based measurement as the UI. */
export function byteLength(text: string): number {
  return new Blob([text]).size;
}
