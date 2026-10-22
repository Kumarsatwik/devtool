"use client";

import { CopyButton } from "@/components/copy-button";

export function ResultRow({ label, value, extra, mono, copy }: { label: string; value: string; extra?: string; mono?: boolean; copy: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded bg-muted/10 text-xs border border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {extra ? <span className="text-xs text-muted-foreground">{extra}</span> : <CopyButton text={copy} />}
      </div>
      <span className={`text-sm font-bold text-foreground break-all ${mono ? "font-mono" : ""}`}>{value}</span>
      {extra && <div className="flex items-center justify-end"><CopyButton text={copy} /></div>}
    </div>
  );
}
