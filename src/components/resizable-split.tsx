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

interface UseSplitResizeOptions {
  initialPercent?: number;
}

/**
 * Drag and keyboard state for a two-pane split. Pointer capture on the handle
 * keeps the drag tracking when the cursor outruns it or crosses a preview.
 */
export function useSplitResize({ initialPercent = 50 }: UseSplitResizeOptions = {}) {
  const [percent, setPercent] = useState(() => clampSplitPercent(initialPercent));
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
      const next = splitPercentFromPointer(event.clientX, rect.left, rect.width);
      if (next !== null) setPercent(next);
    },
    [isResizing],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const next = nextSplitPercentFromKey(percent, event.key);
      if (next === null) return;
      event.preventDefault();
      setPercent(next);
    },
    [percent],
  );

  return {
    percent,
    isResizing,
    containerRef,
    dividerProps: {
      role: "separator",
      "aria-orientation": "vertical",
      "aria-valuenow": Math.round(percent),
      "aria-valuemin": MIN_SPLIT_PERCENT,
      "aria-valuemax": MAX_SPLIT_PERCENT,
      tabIndex: 0,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: () => setIsResizing(false),
      onPointerCancel: () => setIsResizing(false),
      onKeyDown: handleKeyDown,
    } as const,
    containerStyle: { "--split": `${percent}%` } as CSSProperties,
  };
}

interface SplitDividerProps {
  dividerProps: ReturnType<typeof useSplitResize>["dividerProps"];
  isResizing: boolean;
  label: string;
  className?: string;
}

export function SplitDivider({ dividerProps, isResizing, label, className }: SplitDividerProps) {
  return (
    <div
      {...dividerProps}
      aria-label={label}
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

interface ResizableSplitProps {
  initialPercent?: number;
  first: ReactNode;
  second: ReactNode;
  /** Accessible name for the drag handle. */
  label: string;
}

/** Stacks on small screens; a draggable split at `lg`, sized by `--split`. */
export function ResizableSplit({ initialPercent, first, second, label }: ResizableSplitProps) {
  const { isResizing, containerRef, dividerProps, containerStyle } = useSplitResize({ initialPercent });

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={cn(
        "flex-1 min-h-0 flex flex-col lg:flex-row",
        isResizing && "select-none",
      )}
    >
      <div className="flex flex-col min-h-0 gap-2 w-full lg:w-[var(--split)] lg:shrink-0 lg:flex-none">
        {first}
      </div>

      <SplitDivider dividerProps={dividerProps} isResizing={isResizing} label={label} />

      <div className="flex flex-col min-h-0 gap-2 w-full lg:flex-1 min-w-0">{second}</div>
    </div>
  );
}
