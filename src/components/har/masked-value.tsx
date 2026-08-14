"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { maskValue } from "@/lib/har";

/**
 * Sensitive value masked by default with an explicit reveal toggle.
 */
export function MaskedValue({ value, className = "" }: { value: string; className?: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <span className="font-mono break-all">{revealed ? value : maskValue(value)}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setRevealed((v) => !v);
        }}
        aria-label={revealed ? "Hide value" : "Reveal value"}
        title={revealed ? "Hide value" : "Reveal value"}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-foreground rounded"
      >
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </span>
  );
}
