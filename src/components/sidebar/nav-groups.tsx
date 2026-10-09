"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import { navGroups } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface NavGroupsProps {
  mobile?: boolean;
  openGroups: Record<string, boolean>;
  onToggle: (id: string, open: boolean) => void;
  onNavigate?: () => void;
}

export function NavGroups({ mobile, openGroups, onToggle, onNavigate }: NavGroupsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Developer tools" className="space-y-3">
      {navGroups.map((group) => (
        <Collapsible.Root
          key={group.id}
          open={mobile || openGroups[group.id]}
          onOpenChange={(open) => onToggle(group.id, open)}
        >
          {mobile ? (
            <h2 className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </h2>
          ) : (
            <Collapsible.Trigger className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <group.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className="h-3 w-3 transition-transform duration-150 group-data-[panel-open]:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </Collapsible.Trigger>
          )}
          <Collapsible.Panel>
            <div className="space-y-0.5">
              {group.tools.map((tool) => {
                const active = pathname === tool.href;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-3 text-xs font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      mobile ? "min-h-11 py-2.5" : "py-2",
                      active
                        ? "border-border/80 bg-secondary font-semibold text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-secondary/45 hover:text-foreground",
                    )}
                  >
                    <tool.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{tool.title}</span>
                  </Link>
                );
              })}
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      ))}
    </nav>
  );
}
