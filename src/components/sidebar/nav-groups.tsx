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
      {navGroups.map((group) => {
        const groupActive = group.tools.some((tool) => tool.href === pathname);
        return (
        <Collapsible.Root
          key={group.id}
          open={mobile || openGroups[group.id]}
          onOpenChange={(open) => onToggle(group.id, open)}
        >
          {mobile ? (
            <div className="px-3 py-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{group.label}</h2>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{group.description}</p>
            </div>
          ) : (
            <Collapsible.Trigger data-active-group={groupActive} title={group.description} className="group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground data-[active-group=true]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors group-hover:border-border group-hover:text-foreground group-data-[active-group=true]:border-border group-data-[active-group=true]:text-foreground">
                <group.icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className="h-3 w-3 transition-transform duration-150 group-data-[panel-open]:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </Collapsible.Trigger>
          )}
          <Collapsible.Panel>
            <div className="ml-6 space-y-0.5 border-l border-border/70 pl-2">
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
        );
      })}
    </nav>
  );
}
