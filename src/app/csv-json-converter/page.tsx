import { Suspense } from "react";
import { ToolPageLayout } from "@/components/shell/tool-page-layout";
import { DirectionTabs } from "@/components/converters/direction-tabs";
import CsvToJsonPanel from "@/components/converters/csv-to-json";
import JsonToCsvPanel from "@/components/converters/json-to-csv";

export default function CSVJSONConverterPage() {
  return (
    <ToolPageLayout title="CSV ↔ JSON" description="Convert tabular CSV data and JSON arrays in either direction, entirely in your browser.">
      <Suspense fallback={<p className="text-xs text-muted-foreground">Loading converter…</p>}>
        <DirectionTabs
          first={{ value: "csv", label: "CSV → JSON", content: <CsvToJsonPanel /> }}
          second={{ value: "json", label: "JSON → CSV", content: <JsonToCsvPanel /> }}
        />
      </Suspense>
    </ToolPageLayout>
  );
}
