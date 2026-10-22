import { Suspense } from "react";
import { ToolPageLayout } from "@/components/shell/tool-page-layout";
import { DirectionTabs } from "@/components/converters/direction-tabs";
import JsonToJsPanel from "@/components/converters/json-to-js";
import JsToJsonPanel from "@/components/converters/js-to-json";

export default function JSONJSConverterPage() {
  return (
    <ToolPageLayout title="JSON ↔ JS" description="Convert JSON and JavaScript object literals in either direction. Input is parsed, never executed.">
      <Suspense fallback={<p className="text-xs text-muted-foreground">Loading converter…</p>}>
        <DirectionTabs
          first={{ value: "json", label: "JSON → JS", content: <JsonToJsPanel /> }}
          second={{ value: "js", label: "JS → JSON", content: <JsToJsonPanel /> }}
        />
      </Suspense>
    </ToolPageLayout>
  );
}
