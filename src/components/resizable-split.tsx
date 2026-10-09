"use client";

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_SPLIT_PERCENT,
  MIN_SPLIT_PERCENT,
  clampSplitPercent,
  nextSplitPercentFromKey,
  splitPercentFromPointer,
} from "@/lib/split";

export interface SplitBounds {
  minPercent?: number;
  maxPercent?: number;
  stepPercent?: number;
}

interface UseSplitResizeOptions extends SplitBounds {
  /** Share of the workspace given to the leading pane, in percent. */
  initialPercent?: number;
}

interface UseSplitResizeResult extends SplitBounds {
  /** Current share of the leading pane, in percent. */
  percent: number;
  /** True only while a drag is in flight. */
  isResizing: boolean;
  /** Attach to the element whose width defines 0–100%. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Props to spread onto the drag handle. */
  dividerProps: {
    role: "separator";
    "aria-orientation": "vertical";
    "aria-label": string;
    "aria-valuenow": number;
    "aria-valuemin": number;
    "aria-valuemax": number;
    tabIndex: 0;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  };
  /** Inline style exposing `--split` for width-driven layouts. */
  containerStyle: CSSProperties;
}

/**
 * Drag and keyboard state for a two-pane workspace split.
 *
 * Pointer capture is taken on the handle so the drag keeps tracking even when
 * the cursor outruns the handle or crosses an embedded preview.
 */
export function useSplitResize({
  initialPercent = 50,
  minPercent = MIN_SPLIT_PERCENT,
  maxPercent = MAX_SPLIT_PERCENT,
  stepPercent,
}: UseSplitResizeOptions = {}): UseSplitResizeResult {
  const [percent, setPercent] = useState(() =>
    clampSplitPercent(initialPercent, minPercent, maxPercent),
  );
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isResizing) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = splitPercentFromPointer(
        event.clientX,
        rect.left,
        rect.width,
        minPercent,
        maxPercent,
      );
      if (next !== null) setPercent(next);
    },
    [isResizing, maxPercent, minPercent],
  );

  const endResize = useCallback(() => setIsResizing(false), []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const next = nextSplitPercentFromKey(
        percent,
        event.key,
        minPercent,
        maxPercent,
        stepPercent,
      );
      if (next === null) return;
      event.preventDefault();
      setPercent(next);
    },
    [maxPercent, minPercent, percent, stepPercent],
  );

  return {
    percent,
    isResizing,
    containerRef,
    minPercent,
    maxPercent,
    stepPercent,
    dividerProps: {
      role: "separator",
      "aria-orientation": "vertical",
      "aria-label": "Resize workspace panes",
      "aria-valuenow": Math.round(percent),
      "aria-valuemin": minPercent,
      "aria-valuemax": maxPercent,
      tabIndex: 0,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endResize,
      onPointerCancel: endResize,
      onKeyDown: handleKeyDown,
    },
    containerStyle: { "--split": `${percent}%` } as CSSProperties,
  };
}


interface SplitDividerProps {
  dividerProps: UseSplitResizeResult["dividerProps"];
  isResizing: boolean;
  /** Accessible name; defaults to the shared workspace label. */
  label?: string;
  className?: string;
}

/** The draggable grip between two panes. */
export function SplitDivider({
  dividerProps,
  isResizing,
  label,
  className,
}: SplitDividerProps) {
  return (
    <div
      {...dividerProps}
      aria-label={label ?? dividerProps["aria-label"]}
      className={cn(
        "hidden lg:flex shrink-0 items-center justify-center w-3 cursor-col-resize group outline-none touch-none",
        className,
      )}
    >
      <GripVertical
        className={cn(
          "h-4 w-4 transition-colors",
          isResizing
            ? "text-primary"
            : "text-border group-hover:text-primary/70 group-focus-visible:text-primary/70",
        )}
      />
    </div>
  );
}

interface ResizableSplitProps extends UseSplitResizeOptions {
  /** Leading pane (left on desktop, first when stacked). */
  first: ReactNode;
  /** Trailing pane. */
  second: ReactNode;
  /** Accessible name for the drag handle. */
  label?: string;
  className?: string;
  /** Classes for the leading pane wrapper. */
  firstClassName?: string;
  /** Classes for the trailing pane wrapper. */
  secondClassName?: string;
}

/**
 * Two-pane workspace that stacks on small screens and becomes a draggable
 * split at `lg`, where the leading pane is sized by `--split`.
 */
export function ResizableSplit({
  first,
  second,
  initialPercent,
  minPercent,
  maxPercent,
  stepPercent,
  label,
  className,
  firstClassName,
  secondClassName,
}: ResizableSplitProps) {
  const { isResizing, containerRef, dividerProps, containerStyle } = useSplitResize({
    initialPercent,
    minPercent,
    maxPercent,
    stepPercent,
  });

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={cn(
        "flex-1 min-h-0 flex flex-col lg:flex-row",
        isResizing && "select-none",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col min-h-0 gap-2 w-full lg:w-[var(--split)] lg:shrink-0 lg:flex-none",
          firstClassName,
        )}
      >
        {first}
      </div>

      <SplitDivider dividerProps={dividerProps} isResizing={isResizing} label={label} />

      <div
        className={cn("flex flex-col min-h-0 gap-2 w-full lg:flex-1 min-w-0", secondClassName)}
      >
        {second}
      </div>
    </div>
  );
}
