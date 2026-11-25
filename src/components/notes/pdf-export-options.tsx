"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  PDF_LAYOUT_LIMITS,
  type PdfLayoutOptions,
} from "@/lib/notes/pdf";

const FIELDS = [
  { key: "lineSpacing", label: "Line spacing", unit: "multiplier" },
  { key: "paragraphSpacing", label: "Paragraph spacing", unit: "pt" },
  { key: "margin", label: "Page margin", unit: "mm" },
  { key: "padding", label: "Content padding", unit: "mm" },
] as const;

interface PdfExportOptionsProps {
  options: PdfLayoutOptions;
  onClose: () => void;
  onExport: (options: PdfLayoutOptions) => void;
}

export function PdfExportOptions({
  options,
  onClose,
  onExport,
}: PdfExportOptionsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="pdf-options-title"
      aria-describedby="pdf-options-description"
      onCancel={onClose}
      className={
        "fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md " +
        "max-h-[calc(100%_-_2rem)] overflow-y-auto rounded-xl " +
        "border border-border bg-background p-6 text-foreground " +
        "backdrop:bg-black/50"
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onExport({
            lineSpacing: Number(data.get("lineSpacing")),
            paragraphSpacing: Number(data.get("paragraphSpacing")),
            margin: Number(data.get("margin")),
            padding: Number(data.get("padding")),
          });
        }}
      >
        <h2 id="pdf-options-title" className="text-lg font-semibold">
          PDF layout
        </h2>
        <p
          id="pdf-options-description"
          className="mt-1 text-sm text-muted-foreground"
        >
          Adjust spacing for this export. Your note stays unchanged.
        </p>
        <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map(({ key, label, unit }) => (
            <label key={key} className="grid gap-2 text-sm font-medium">
              <span>{label} ({unit})</span>
              <input
                type="number"
                name={key}
                required
                defaultValue={options[key]}
                {...PDF_LAYOUT_LIMITS[key]}
                className={
                  "w-full rounded-lg border border-border bg-background " +
                  "px-3 py-2 text-foreground outline-none " +
                  "focus-visible:ring-2 focus-visible:ring-ring"
                }
              />
            </label>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Margins and padding apply equally on all sides and add together
          on every page. In the print dialog, choose Save as PDF and keep
          the default margins to use these settings.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Continue to PDF</Button>
        </div>
      </form>
    </dialog>
  );
}
