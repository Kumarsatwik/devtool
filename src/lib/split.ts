// Split geometry, kept free of React so the resize rules are unit testable.

export const MIN_SPLIT_PERCENT = 20;
export const MAX_SPLIT_PERCENT = 80;
const STEP_PERCENT = 2;

export function clampSplitPercent(percent: number): number {
  return Math.min(MAX_SPLIT_PERCENT, Math.max(MIN_SPLIT_PERCENT, percent));
}

/** Null when the container has no measurable width, so the divider holds still. */
export function splitPercentFromPointer(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
): number | null {
  if (!(rectWidth > 0)) return null;
  return clampSplitPercent(((clientX - rectLeft) / rectWidth) * 100);
}

/** Null for keys the divider does not handle. */
export function nextSplitPercentFromKey(percent: number, key: string): number | null {
  if (key === "ArrowLeft") return clampSplitPercent(percent - STEP_PERCENT);
  if (key === "ArrowRight") return clampSplitPercent(percent + STEP_PERCENT);
  if (key === "Home") return MIN_SPLIT_PERCENT;
  if (key === "End") return MAX_SPLIT_PERCENT;
  return null;
}

export function clampPixels(size: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, size));
}
