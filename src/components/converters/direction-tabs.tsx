"use client";

import { type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface DirectionTabsProps {
  first: { value: string; label: string; content: ReactNode };
  second: { value: string; label: string; content: ReactNode };
}

export function DirectionTabs({ first, second }: DirectionTabsProps) {
  const searchParams = useSearchParams();
  const direction = searchParams.get("dir") === second.value ? second.value : first.value;

  const changeDirection = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("dir", value);
    // Next integrates native history updates with useSearchParams, including Back/Forward.
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
  };

  return (
    <Tabs value={direction} onValueChange={changeDirection} className="h-full min-h-0 gap-4">
      <TabsList variant="line" aria-label="Conversion direction" className="shrink-0 gap-3">
        <TabsTrigger value={first.value} className="px-3 text-xs">{first.label}</TabsTrigger>
        <TabsTrigger value={second.value} className="px-3 text-xs">{second.label}</TabsTrigger>
      </TabsList>
      <TabsContent value={first.value} keepMounted className="min-h-0 data-[hidden]:hidden">
        {first.content}
      </TabsContent>
      <TabsContent value={second.value} keepMounted className="min-h-0 data-[hidden]:hidden">
        {second.content}
      </TabsContent>
    </Tabs>
  );
}
