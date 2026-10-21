"use client";

import { type ReactNode } from "react";

interface StatusMessageProps {
  type: "success" | "error" | "info";
  children: ReactNode;
}

export function StatusMessage({ type, children }: StatusMessageProps) {
  return (
    <div
      className={`flex items-start sm:items-center gap-3 text-xs px-4 py-3 rounded border shadow-none transition-all duration-150 ${
        type === "error"
          ? "text-destructive bg-destructive/5 border-destructive/20"
          : type === "success"
          ? "text-foreground bg-emerald-500/5 border-emerald-500/25"
          : "text-muted-foreground bg-muted/40 border-border"
      }`}
    >
      <div className="flex-1 flex items-center gap-2 min-w-0 font-mono">
        {children}
      </div>
    </div>
  );
}
