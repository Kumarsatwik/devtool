"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ToolPageLayout } from "@/components/tool-page-layout";
import { Copy, Check, RefreshCw } from "lucide-react";

type EpochUnit = "seconds" | "milliseconds";

const IST_TIMEZONE = "Asia/Kolkata";
const UTC_TIMEZONE = "UTC";

function getMs(epoch: number, unit: EpochUnit) {
  return unit === "seconds" ? epoch * 1000 : epoch;
}

function fmtTz(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0 flex items-center gap-1">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function EpochConverterPage() {
  // Inputs start empty and are filled with "now" after mount: time-dependent
  // defaults would render different text on the server (build time) and the
  // client (hydration time), causing a hydration mismatch.
  const [epochInput, setEpochInput] = useState("");
  const [epochUnit, setEpochUnit] = useState<EpochUnit>("seconds");
  const [dateInput, setDateInput] = useState("");
  // 0 until mounted: the server and client would otherwise render different
  // clock values and React would report a hydration mismatch (error #418).
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const now = Date.now();
    setNowTick(now);
    setEpochInput(Math.floor(now / 1000).toString());
    setDateInput(toLocalInput(new Date(now)));
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const epochConversion = useMemo(() => {
    const trimmed = epochInput.trim();
    if (!trimmed) return { error: null as string | null, date: null as Date | null };
    if (!/^-?\d+$/.test(trimmed)) return { error: "Enter a valid number", date: null };
    const ms = getMs(Number(trimmed), epochUnit);
    const date = new Date(ms);
    if (isNaN(date.getTime())) return { error: "Out of range", date: null };
    return { error: null, date };
  }, [epochInput, epochUnit]);

  const dateConversion = useMemo(() => {
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) return { error: "Invalid date", epochSeconds: null, epochMs: null, utc: null };
    return {
      error: null as string | null,
      epochSeconds: Math.floor(parsed.getTime() / 1000),
      epochMs: parsed.getTime(),
      utc: parsed.toISOString(),
    };
  }, [dateInput]);

  const nowMs = nowTick;
  const nowSeconds = Math.floor(nowMs / 1000);

  const pasteEpoch = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return;
      setEpochInput(text);
      if (Number(text) >= 1e12) setEpochUnit("milliseconds");
    } catch {}
  }, []);

  return (
    <ToolPageLayout title="Epoch Converter" description="Convert between Unix timestamps and human-readable dates.">
      <div className="h-full flex flex-col gap-4">
        {/* Live UTC + epoch bar */}
        <div className="flex items-center justify-between text-xs border border-border rounded px-4 py-2.5 bg-card shrink-0 select-none">
          <div className="flex items-center gap-6 text-muted-foreground font-mono">
            <span>
              UTC: <span className="font-semibold text-foreground">{nowMs ? new Date(nowMs).toISOString().replace("T", " ").slice(0, 19) : "—"}</span>
            </span>
            <span>
              IST: <span className="font-semibold text-foreground">{nowMs ? fmtTz(new Date(nowMs), IST_TIMEZONE) : "—"}</span>
            </span>
            <span>
              Epoch: <span className="font-semibold text-foreground">{nowMs ? nowSeconds : "—"}</span>
              {nowMs > 0 && <span className="text-xs ml-1">({nowMs} ms)</span>}
            </span>
          </div>
          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>

        {/* Two-column converters */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-2 overflow-auto">
          {/* Epoch → Date */}
          <div className="border border-border bg-card rounded p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Epoch → Date</h3>
              <div className="flex items-center gap-2">
                <div className="flex border border-border rounded p-0.5 bg-background">
                  {(["seconds", "milliseconds"] as EpochUnit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setEpochUnit(u)}
                      className={`h-6 px-2 text-xs font-semibold rounded transition-colors ${
                        epochUnit === u ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setEpochInput(nowSeconds.toString()); setEpochUnit("seconds"); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Now
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={epochInput}
                onChange={(e) => setEpochInput(e.target.value)}
                placeholder="e.g. 1721030400"
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
              />
              <button onClick={pasteEpoch} className="text-xs font-semibold border border-border rounded px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
                Paste
              </button>
            </div>

            {epochConversion.error ? (
              <p className="text-xs text-destructive">{epochConversion.error}</p>
            ) : epochConversion.date ? (
              <div className="flex flex-col gap-2">
                <ResultRow label="UTC" value={fmtTz(epochConversion.date, UTC_TIMEZONE)} extra="GMT +00:00" copy={epochConversion.date.toISOString()} />
                <ResultRow label="IST" value={fmtTz(epochConversion.date, IST_TIMEZONE)} extra="GMT +05:30" copy={fmtTz(epochConversion.date, IST_TIMEZONE)} />
                <ResultRow label="Local" value={nowMs > 0 ? epochConversion.date.toLocaleString() : "—"} extra="" copy={epochConversion.date.toISOString()} />
                <ResultRow label="ISO 8601" value={epochConversion.date.toISOString()} extra="" mono copy={epochConversion.date.toISOString()} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Enter an epoch timestamp</p>
            )}
          </div>

          {/* Date → Epoch */}
          <div className="border border-border bg-card rounded p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Date → Epoch</h3>
              <button onClick={() => setDateInput(toLocalInput(new Date()))} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Now
              </button>
            </div>

            <input
              type="datetime-local"
              step="1"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
            />

            {dateConversion.error ? (
              <p className="text-xs text-destructive">{dateConversion.error}</p>
            ) : dateConversion.epochSeconds !== null ? (
              <div className="flex flex-col gap-2">
                <ResultRow label="Seconds" value={dateConversion.epochSeconds.toString()} extra="" mono copy={dateConversion.epochSeconds.toString()} />
                <ResultRow label="Milliseconds" value={dateConversion.epochMs?.toString() ?? ""} extra="" mono copy={dateConversion.epochMs?.toString() ?? ""} />
                {dateConversion.utc && <ResultRow label="UTC ISO" value={dateConversion.utc} extra="" mono copy={dateConversion.utc} />}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Select a date</p>
            )}
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
}

function ResultRow({ label, value, extra, mono, copy }: { label: string; value: string; extra?: string; mono?: boolean; copy: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded bg-muted/10 text-xs border border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {extra ? <span className="text-xs text-muted-foreground">{extra}</span> : <CopyButton text={copy} />}
      </div>
      <span className={`text-sm font-bold text-foreground break-all ${mono ? "font-mono" : ""}`}>{value}</span>
      {extra && <div className="flex items-center justify-end"><CopyButton text={copy} /></div>}
    </div>
  );
}
