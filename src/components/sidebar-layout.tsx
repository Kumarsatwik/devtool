"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { DataToolsMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { navGroups } from "@/lib/tools";
import { NavGroups } from "@/components/sidebar/nav-groups";
import { cn } from "@/lib/utils";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [groupState, setGroupState] = useState({
    pathname,
    open: Object.fromEntries(navGroups.map((group) => [group.id, true])),
  });

  // Route changes reopen the destination group; manual toggles then take priority.
  if (groupState.pathname !== pathname) {
    const activeGroup = navGroups.find((group) =>
      group.tools.some((tool) => tool.href === pathname),
    );
    setGroupState({
      pathname,
      open: activeGroup
        ? { ...groupState.open, [activeGroup.id]: true }
        : groupState.open,
    });
  }

  const toggleGroup = (id: string, open: boolean) => {
    setGroupState((state) => ({
      ...state,
      open: { ...state.open, [id]: open },
    }));
  };

  // Close mobile navigation drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // A hidden modal must not keep trapping focus when switching to desktop.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches) setMobileOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex flex-1 min-h-screen lg:flex-none lg:min-h-0 lg:h-[calc(100dvh-3.5rem)] bg-background border-t">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col overflow-y-auto border-r border-border bg-card/10 shrink-0 select-none transition-[width] duration-150 motion-reduce:transition-none",
          navCollapsed ? "w-14" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex-1 flex flex-col justify-between py-6 space-y-6",
            navCollapsed ? "px-1" : "px-4",
          )}
        >
          <div className="space-y-4">
            <TooltipProvider>
              <div
                className={cn(
                  "flex items-center gap-1 py-1",
                  navCollapsed && "flex-col",
                )}
              >
                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href="/"
                      aria-label="Return to Home"
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground",
                        navCollapsed && "h-9 w-9 flex-none justify-center px-0",
                      )}
                    >
                      <Home className="h-3.5 w-3.5 shrink-0" />
                      <span
                        className={cn("truncate", navCollapsed && "sr-only")}
                      >
                        Return to Home
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Return to Home</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn(navCollapsed && "size-9")}
                      aria-expanded={!navCollapsed}
                      aria-controls="desktop-sidebar-nav"
                      aria-label={
                        navCollapsed
                          ? "Expand navigation"
                          : "Collapse navigation"
                      }
                      onClick={() => setNavCollapsed((v) => !v)}
                    >
                      {navCollapsed ? (
                        <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <PanelLeftClose
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {navCollapsed ? "Expand navigation" : "Collapse navigation"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div id="desktop-sidebar-nav" className="space-y-1">
              <NavGroups
                collapsed={navCollapsed}
                openGroups={groupState.open}
                onToggle={toggleGroup}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Hamburger Toggle */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Trigger
          className="lg:hidden fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full shadow-md border border-border bg-card text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Dialog.Trigger>

        {/* Mobile Drawer Slide-over */}
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm" />
          <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto bg-card border-r border-border p-4 space-y-6 outline-none">
            <Dialog.Title className="sr-only">
              Developer tool navigation
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Browse tools by category.
            </Dialog.Description>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-bold text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  <DataToolsMark className="h-4 w-4" />
                  <span>DataTools</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Close navigation"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Data Utilities
                </p>
                <div className="h-[1px] bg-border/50" />
                <NavGroups
                  mobile
                  openGroups={groupState.open}
                  onToggle={toggleGroup}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Workspace content region */}
      <div className="flex-1 min-w-0 bg-background overflow-clip">
        {children}
      </div>
    </div>
  );
}
