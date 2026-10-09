/**
 * Pure geometry helpers for draggable workspace splits.
 *
 * Kept free of React and the DOM so the resize rules (clamping, keyboard
 * stepping, pointer-to-percent mapping) can be unit tested directly.
 */

/** Smallest share the leading pane may be dragged down to. */
export const MIN_SPLIT_PERCENT = 20;

/** Largest share the leading pane may be dragged up to. */
export const MAX_SPLIT_PERCENT = 80;

/** Share moved per arrow-key press, in percent. */
export const SPLIT_STEP_PERCENT = 2;

/** Keyboard keys that move a split, mapped to their percent delta. */
const KEY_DELTAS: Record<string, number> = {
  ArrowLeft: -SPLIT_STEP_PERCENT,
  ArrowRight: SPLIT_STEP_PERCENT,
};

/** Confines a split share to its allowed range. */
export function clampSplitPercent(
  percent: number,
  min = MIN_SPLIT_PERCENT,
  max = MAX_SPLIT_PERCENT,
): number {
  // NaN has no meaningful position, so fall back to the minimum; infinities
  // are still ordered and clamp to a bound normally.
  if (Number.isNaN(percent)) return min;
  return Math.min(max, Math.max(min, percent));
}

/**
 * Maps a pointer position onto a split share of the container.
 * Returns null when the container has no measurable width, so callers can
 * skip the update instead of snapping the divider to a bogus position.
 */
export function splitPercentFromPointer(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  min = MIN_SPLIT_PERCENT,
  max = MAX_SPLIT_PERCENT,
): number | null {
  if (!Number.isFinite(clientX) || !Number.isFinite(rectLeft)) return null;
  if (!(rectWidth > 0)) return null;
  return clampSplitPercent(((clientX - rectLeft) / rectWidth) * 100, min, max);
}

/**
 * Resolves a key press on the split divider to the next share.
 * Returns null for keys the divider does not handle.
 */
export function nextSplitPercentFromKey(
  percent: number,
  key: string,
  min = MIN_SPLIT_PERCENT,
  max = MAX_SPLIT_PERCENT,
  step = SPLIT_STEP_PERCENT,
): number | null {
  const current = clampSplitPercent(percent, min, max);
  if (key in KEY_DELTAS) {
    return clampSplitPercent(current + KEY_DELTAS[key] * (step / SPLIT_STEP_PERCENT), min, max);
  }
  if (key === "Home") return min;
  if (key === "End") return max;
  return null;
}

/** Confines a pixel size (e.g. a drawer width) to its allowed range. */
export function clampPixels(size: number, min: number, max: number): number {
  if (Number.isNaN(size)) return min;
  return Math.min(max, Math.max(min, size));
}
