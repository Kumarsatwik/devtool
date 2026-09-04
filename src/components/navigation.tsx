"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Braces } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function Navigation() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background select-none">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        
        {/* Brand Name */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-sm tracking-tight"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-background">
              <Braces className="h-3.5 w-3.5" />
            </div>
            <span className="text-foreground font-semibold">
              DataTools
            </span>
          </Link>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3">
          {isHomepage && (
            <div className="flex items-center gap-4">
              <Link
                href="/#tools"
                className={buttonVariants({ variant: "outline", size: "xs", className: "h-7 text-xs font-semibold rounded" })}
              >
                Browse Tools
              </Link>
            </div>
          )}
          
          <div className="h-4 w-[1px] bg-border" />
          <ThemeToggle />
        </div>

      </div>
    </header>
  );
}