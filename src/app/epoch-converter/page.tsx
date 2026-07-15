"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import {
  Clock,
  Settings2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Globe,
  Timer,
  Copy,
  Check,
  ClipboardPaste,
  RefreshCw,
  ArrowRightLeft,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EpochUnit = "seconds" | "milliseconds";

const IST_TIMEZONE = "Asia/Kolkata";
const UTC_TIMEZONE = "UTC";

function getEpochValueInMs(epoch: number, unit: EpochUnit): number {
  return unit === "seconds" ? epoch * 1000 : epoch;
}

function formatInTimezone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...options,
  }).format(date);
}

function formatTimezoneOffset(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  return offsetPart ? offsetPart.value : "";
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toLocalDatetimeInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function EpochConverterPage() {
  // Epoch -> Date state
  const [epochInput, setEpochInput] = useState<string>(() =>
    Math.floor(Date.now() / 1000).toString(),
  );
  const [epochUnit, setEpochUnit] = useState<EpochUnit>("seconds");

  // Date -> Epoch state
  const [dateInput, setDateInput] = useState<string>(() =>
    toLocalDatetimeInputValue(new Date()),
  );
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Tick the "current" clock once per second for the live now panel
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ---- Epoch -> Date derived values ----
  const epochConversion = useMemo(() => {
    const trimmed = epochInput.trim();
    if (!trimmed) {
      return { error: null as string | null, date: null as Date | null };
    }
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { error: "Epoch value must be a valid number.", date: null };
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
      return { error: "Epoch value is not a finite number.", date: null };
    }
    const ms = getEpochValueInMs(numeric, epochUnit);
    const date = new Date(ms);
    if (isNaN(date.getTime())) {
      return {
        error: "Epoch value is out of representable range.",
        date: null,
      };
    }
    return { error: null, date };
  }, [epochInput, epochUnit]);

  // ---- Date -> Epoch derived values ----
  const dateConversion = useMemo(() => {
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) {
      return {
        error: "Selected date is invalid.",
        epochSeconds: null,
        epochMs: null,
        utcDate: null,
      };
    }
    return {
      error: null as string | null,
      epochSeconds: Math.floor(parsed.getTime() / 1000),
      epochMs: parsed.getTime(),
      utcDate: parsed,
    };
  }, [dateInput]);

  // ---- Live "now" values ----
  const nowDate = useMemo(() => new Date(nowTick), [nowTick]);
  const nowEpochSeconds = Math.floor(nowTick / 1000);
  const nowEpochMs = nowTick;

  const handleEpochSample = useCallback(() => {
    setEpochInput(Math.floor(Date.now() / 1000).toString());
    setEpochUnit("seconds");
  }, []);

  const [pasteStatus, setPasteStatus] = useState<"idle" | "ok" | "err">("idle");

  const handlePasteEpoch = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.trim();
      if (!cleaned) {
        setPasteStatus("err");
        setTimeout(() => setPasteStatus("idle"), 1500);
        return;
      }
      setEpochInput(cleaned);
      // Auto-detect unit: 13+ digit numbers are typically milliseconds
      const numeric = Number(cleaned);
      if (Number.isFinite(numeric) && Math.abs(numeric) >= 1e12) {
        setEpochUnit("milliseconds");
      } else {
        setEpochUnit("seconds");
      }
      setPasteStatus("ok");
      setTimeout(() => setPasteStatus("idle"), 1500);
    } catch (err) {
      console.error("Clipboard read failed", err);
      setPasteStatus("err");
      setTimeout(() => setPasteStatus("idle"), 1500);
    }
  }, []);

  const handleUseNowForDate = useCallback(() => {
    setDateInput(toLocalDatetimeInputValue(new Date()));
  }, []);

  const handleSwapFromEpochToDate = useCallback(() => {
    if (!dateConversion.epochSeconds) return;
    setEpochInput(dateConversion.epochSeconds.toString());
    setEpochUnit("seconds");
  }, [dateConversion.epochSeconds]);

  return (
    <ToolPageLayout
      title="Epoch Converter"
      description="Convert Unix epoch timestamps to human-readable IST and UTC dates, and convert any date back to epoch in UTC."
    >
      <div className="space-y-6">
        {/* Live Current Time Strip */}
        <div className="border border-border bg-card rounded p-4 shadow-none select-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span>Current System Time</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Live</span>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <CurrentTimeCard
              label="Local (Browser)"
              value={formatInTimezone(
                nowDate,
                Intl.DateTimeFormat().resolvedOptions().timeZone,
              )}
              sub={formatTimezoneOffset(
                nowDate,
                Intl.DateTimeFormat().resolvedOptions().timeZone,
              )}
            />
            <CurrentTimeCard
              label="UTC"
              value={formatInTimezone(nowDate, UTC_TIMEZONE)}
              sub="GMT +00:00"
            />
            <CurrentTimeCard
              label="IST"
              value={formatInTimezone(nowDate, IST_TIMEZONE)}
              sub="GMT +05:30"
            />
            <CurrentTimeCard
              label="Now → Epoch (UTC)"
              value={nowEpochSeconds.toString()}
              sub={`${nowEpochMs} ms`}
              mono
            />
          </div>
        </div>

        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Conversion Options</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">
              Epoch Unit:
            </span>
            <div className="flex border border-border rounded p-0.5 bg-background">
              {(["seconds", "milliseconds"] as EpochUnit[]).map((unit) => (
                <Button
                  key={unit}
                  variant={epochUnit === unit ? "secondary" : "ghost"}
                  size="xs"
                  className="h-6 text-[10px] px-2.5 rounded font-semibold"
                  onClick={() => setEpochUnit(unit)}
                >
                  {unit}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Two-column converters */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* EPOCH -> DATE */}
          <div className="border border-border bg-card rounded p-5 shadow-none space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span>Epoch → Date</span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleEpochSample}
              >
                <RefreshCw className="h-3 w-3" />
                <span>Now</span>
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Epoch Timestamp ({epochUnit})
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={epochInput}
                  onChange={(e) => setEpochInput(e.target.value)}
                  placeholder="e.g. 1721030400"
                  className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto px-3 font-semibold gap-1.5 shrink-0"
                  onClick={handlePasteEpoch}
                  title="Paste from clipboard"
                >
                  {pasteStatus === "ok" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : pasteStatus === "err" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <ClipboardPaste className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {pasteStatus === "ok"
                      ? "Pasted"
                      : pasteStatus === "err"
                        ? "Empty"
                        : "Paste"}
                  </span>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Tip: Paste auto-detects seconds vs. milliseconds (13+ digit
                values are treated as ms).
              </p>
            </div>

            {epochConversion.error ? (
              <StatusMessage type="error">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-destructive">
                    Invalid Epoch
                  </p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    {epochConversion.error}
                  </p>
                </div>
              </StatusMessage>
            ) : epochConversion.date ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                <DateResult
                  label="UTC"
                  icon={<Globe className="h-3.5 w-3.5" />}
                  iso={epochConversion.date.toISOString()}
                  formatted={formatInTimezone(
                    epochConversion.date,
                    UTC_TIMEZONE,
                  )}
                  offset="GMT +00:00"
                />
                <DateResult
                  label="IST (Asia/Kolkata)"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  iso={formatInTimezone(epochConversion.date, IST_TIMEZONE, {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  }).replace(/(\d{2})\/(\d{2})\/(\d{4}), /, "$3-$2-$1T")}
                  formatted={formatInTimezone(
                    epochConversion.date,
                    IST_TIMEZONE,
                  )}
                  offset="GMT +05:30"
                />
                <DateResult
                  label="Local Browser"
                  icon={<Clock className="h-3.5 w-3.5" />}
                  iso={epochConversion.date.toString()}
                  formatted={epochConversion.date.toLocaleString()}
                  offset={formatTimezoneOffset(
                    epochConversion.date,
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                  )}
                />
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic py-4 text-center">
                Enter an epoch value to convert.
              </div>
            )}
          </div>

          {/* DATE -> EPOCH */}
          <div className="border border-border bg-card rounded p-5 shadow-none space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Date → Epoch (UTC)</span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleUseNowForDate}
              >
                <RefreshCw className="h-3 w-3" />
                <span>Now</span>
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Date &amp; Time (Local Browser TZ)
              </label>
              <input
                type="datetime-local"
                step="1"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                The selected local time is converted to UTC, then expressed as
                an epoch timestamp.
              </p>
            </div>

            {dateConversion.error ? (
              <StatusMessage type="error">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-destructive">Invalid Date</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    {dateConversion.error}
                  </p>
                </div>
              </StatusMessage>
            ) : (
              <div className="space-y-3 animate-in fade-in duration-150">
                <EpochResult
                  label="Epoch (Seconds)"
                  value={dateConversion.epochSeconds?.toString() ?? ""}
                />
                <EpochResult
                  label="Epoch (Milliseconds)"
                  value={dateConversion.epochMs?.toString() ?? ""}
                />
                <div className="border border-border rounded p-3 bg-muted/10 space-y-1.5 text-xs">
                  <span className="text-[9px] text-muted-foreground block uppercase font-semibold">
                    UTC ISO 8601
                  </span>
                  <code className="font-mono text-foreground break-all text-[11px]">
                    {dateConversion.utcDate?.toISOString()}
                  </code>
                </div>

                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-6 text-[11px] font-semibold"
                    onClick={handleSwapFromEpochToDate}
                    disabled={!dateConversion.epochSeconds}
                  >
                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                    Send to Epoch → Date
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Success / status footer for the live now panel */}
        <StatusMessage type="info">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              IST offset:{" "}
              <strong className="text-foreground">UTC +05:30</strong>
            </span>
            <span>
              Time zones use{" "}
              <strong className="text-foreground">Intl.DateTimeFormat</strong>{" "}
              (browser-native).
            </span>
            <span>
              All conversions run{" "}
              <strong className="text-foreground">locally</strong> — no data is
              uploaded.
            </span>
          </div>
        </StatusMessage>
      </div>
    </ToolPageLayout>
  );
}

function CurrentTimeCard({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="border border-border rounded p-3 bg-muted/10 space-y-1.5">
      <span className="text-[9px] text-muted-foreground block uppercase font-semibold tracking-wider">
        {label}
      </span>
      <strong
        className={cn(
          "text-sm font-bold text-foreground block break-all",
          mono && "font-mono",
        )}
      >
        {value}
      </strong>
      {sub && (
        <span className="text-[10px] text-muted-foreground block font-mono">
          {sub}
        </span>
      )}
    </div>
  );
}

function DateResult({
  label,
  icon,
  iso,
  formatted,
  offset,
}: {
  label: string;
  icon: React.ReactNode;
  iso: string;
  formatted: string;
  offset: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iso);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="border border-border rounded p-3 bg-muted/10 space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground block uppercase font-semibold tracking-wider flex items-center gap-1">
          {icon}
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          title="Copy ISO string"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <strong className="text-sm font-mono font-bold text-foreground block break-all">
        {formatted}
      </strong>
      <span className="text-[10px] text-muted-foreground block font-mono break-all">
        {iso}
      </span>
      {offset && (
        <span className="text-[10px] text-muted-foreground block">
          {offset}
        </span>
      )}
    </div>
  );
}

function EpochResult({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="border border-border rounded p-3 bg-muted/10 space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground block uppercase font-semibold tracking-wider">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          title="Copy epoch value"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <strong className="text-base font-mono font-bold text-foreground block break-all">
        {value}
      </strong>
    </div>
  );
}
