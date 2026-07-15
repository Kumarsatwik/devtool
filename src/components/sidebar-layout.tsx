"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  Braces,
  CheckCircle,
  FileCode2,
  FileSpreadsheet,
  Sparkles,
  Menu,
  X,
  Home,
  Database,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const tools = [
  { href: "/csv-to-json", label: "CSV → JSON", icon: FileSpreadsheet },
  { href: "/json-to-csv", label: "JSON → CSV", icon: FileSpreadsheet },
  { href: "/json-to-js", label: "JSON → JS", icon: FileCode2 },
  { href: "/js-to-json", label: "JS → JSON", icon: FileCode2 },
  { href: "/json-beautifier", label: "JSON Beautifier", icon: Sparkles },
  { href: "/json-validator", label: "JSON Validator", icon: CheckCircle },
  { href: "/json-compare", label: "JSON Compare", icon: ArrowLeftRight },
  { href: "/epoch-converter", label: "Epoch Converter", icon: Clock },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile navigation drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-1 min-h-screen bg-background border-t">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card/10 shrink-0 select-none">
        <div className="flex-1 flex flex-col justify-between py-6 px-4 space-y-6">
          <div className="space-y-4">
            <div className="px-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return to Home</span>
              </Link>
            </div>

            <div className="space-y-1">
              <div className="px-3 py-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Data Utilities
                </p>
              </div>
              <nav className="space-y-0.5">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = pathname === tool.href;
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-secondary text-foreground font-semibold border border-border/80"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/45 border border-transparent",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tool.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Hamburger Toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setMobileOpen(!mobileOpen)}
          size="icon"
          className="h-10 w-10 rounded-full shadow-md border border-border bg-card text-foreground hover:bg-secondary"
          aria-label="Toggle Navigation Drawer"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Drawer Slide-over */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-background/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border p-6 space-y-6 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-bold text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  <Braces className="h-4 w-4" />
                  <span>DataTools</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Developer Utilities
                </p>
                <div className="h-[1px] bg-border/50" />
                <nav className="grid gap-1 pt-1">
                  {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = pathname === tool.href;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                          isActive
                            ? "bg-secondary text-foreground font-semibold border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tool.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workspace content region */}
      <div className="flex-1 min-w-0 bg-background overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
