export const MAX_UPLOAD_MB = 10;

export function fileSizeError(
  file: Pick<File, "name" | "size">,
  maxSizeMB = MAX_UPLOAD_MB,
): string | null {
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `"${file.name}" is too large. Uploads are limited to ${maxSizeMB}MB.`;
  }
  return null;
}
