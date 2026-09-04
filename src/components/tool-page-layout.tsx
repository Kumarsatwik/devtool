"use client";

import { type ReactNode } from "react";
import { SidebarLayout } from "@/components/sidebar-layout";

interface ToolPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ToolPageLayout({ title, description, children }: ToolPageLayoutProps) {
  return (
    <SidebarLayout>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4 w-full h-full flex flex-col">

        {/* Title Block */}
        <div className="space-y-1 select-none shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          {children}
        </div>

      </div>
    </SidebarLayout>
  );
}

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