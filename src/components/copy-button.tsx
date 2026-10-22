"use client";

import { Copy, Check } from "lucide-react";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";

export function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopyFeedback();

  return (
    <button onClick={() => void copy(text)} className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0 flex items-center gap-1">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
