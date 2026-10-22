"use client";

import { type ReactNode } from "react";
import { SidebarLayout } from "@/components/shell/sidebar-layout";

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

