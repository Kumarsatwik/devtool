"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { SidebarLayout } from "@/components/sidebar-layout";

interface ToolPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ToolPageLayout({ title, children }: ToolPageLayoutProps) {
  return (
    <SidebarLayout>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-6xl w-full">
        
        {/* Header Breadcrumb Navigation */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground select-none">
            <Link 
              href="/" 
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">{title}</span>
          </div>
        </div>

        {/* Title Block */}
        <div className="space-y-1 select-none">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in duration-200">
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
          ? "text-foreground bg-muted/40 border-border"
          : "text-muted-foreground bg-muted/40 border-border"
      }`}
    >
      <div className="flex-1 flex items-center gap-2 min-w-0 font-mono">
        {children}
      </div>
    </div>
  );
}