"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { FileUpload } from "@/components/file-upload";
import {
  sanitizeJson,
  collectAllKeys,
  PRESET_SENSITIVE_KEYS,
  type SanitizeOptions,
} from "@/lib/sanitize";
import { validateJSON } from "@/lib/json";
import {
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  Settings2,
} from "lucide-react";

const sampleJSON = `{
  "user": {
    "id": 8402,
    "name": "Priya Raman",
    "email": "priya.raman@arclight-systems.com",
    "password": "sup3r-secret",
    "ssn": "531-42-8816"
  },
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  },
  "billing": {
    "cardNumber": "4921 8843 1109 2756",
    "cvv": "317"
  },
  "orders": [
    { "id": 51091, "total": 47.2, "customerEmail": "priya.raman@arclight-systems.com" },
    { "id": 51244, "total": 12.87, "customerEmail": "priya.raman@arclight-systems.com" }
  ],
  "meta": {
    "api_key": "sk_live_9f8e7d6c",
    "clientSecret": "c0ffee-secret"
  }
}`;

export default function JsonSanitizerPage() {
  const [input, setInput] = useState(sampleJSON);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sensitiveKeys, setSensitiveKeys] = useState<string[]>([
    "password",
    "token",
    "apiKey",
    "secret",
    "ssn",
    "cardNumber",
    "cvv",
  ]);
  const [newKey, setNewKey] = useState("");
  const [matchMode, setMatchMode] = useState<SanitizeOptions["matchMode"]>("contains");
  const [redactionValue, setRedactionValue] = useState("[REDACTED]");
  const [hideAllValues, setHideAllValues] = useState(false);
  const [autoSanitize, setAutoSanitize] = useState(true);
  const preHideAllRef = useRef<{ keys: string[]; mode: SanitizeOptions["matchMode"] } | null>(null);

  const options = useMemo<SanitizeOptions>(
    () => ({ sensitiveKeys, redactionValue, matchMode, hideAllValues }),
    [sensitiveKeys, redactionValue, matchMode, hideAllValues],
  );

  const stats = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return sanitizeJson(input, options);
    } catch {
      return null;
    }
  }, [input, options]);

  const handleProcess = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }
    try {
      setError(null);
      setOutput(sanitizeJson(input, options).output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sanitization failed");
      setOutput("");
    }
  }, [input, options]);

  useEffect(() => {
    if (autoSanitize) {
      handleProcess();
    }
  }, [input, autoSanitize, handleProcess]);

  const validation = validateJSON(input);

  const addKey = () => {
    const key = newKey.trim();
    if (!key) return;
    setSensitiveKeys((prev) =>
      prev.some((k) => k.toLowerCase() === key.toLowerCase()) ? prev : [...prev, key],
    );
    setNewKey("");
  };

  const removeKey = (key: string) => {
    setSensitiveKeys((prev) => prev.filter((k) => k !== key));
  };

  const handleHideAll = (checked: boolean) => {
    setHideAllValues(checked);
    if (checked) {
      // Remember the current list so unchecking restores it.
      preHideAllRef.current = { keys: sensitiveKeys, mode: matchMode };
      setMatchMode("exact"); // exact matching so removing a key reliably un-hides it
      const parsed = validateJSON(input);
      if (parsed.valid && parsed.parsed != null) {
        const allKeys = collectAllKeys(parsed.parsed);
        setSensitiveKeys((prev) => {
          const set = new Set(prev.map((k) => k.toLowerCase()));
          allKeys.forEach((k) => set.add(k));
          return [...set];
        });
      }
    } else if (preHideAllRef.current) {
      setSensitiveKeys(preHideAllRef.current.keys);
      setMatchMode(preHideAllRef.current.mode);
      preHideAllRef.current = null;
    }
  };

  const loadPresets = () => {
    setSensitiveKeys([...PRESET_SENSITIVE_KEYS]);
  };

  return (
    <ToolPageLayout
      title="JSON Sanitizer"
      description="Redact sensitive values from API responses and database records before sharing them."
    >
      <div className="h-full flex flex-col gap-4">
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-3 rounded text-xs select-none shadow-none shrink-0">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Sanitization Rules</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Match mode */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Match:</span>
              <div className="flex border border-border rounded p-0.5 bg-background">
                <Button
                  variant={matchMode === "contains" ? "secondary" : "ghost"}
                  size="xs"
                  className="h-6 px-3 rounded text-xs font-semibold"
                  onClick={() => setMatchMode("contains")}
                  title="Match keys that contain the pattern anywhere"
                >
                  Contains
                </Button>
                <Button
                  variant={matchMode === "exact" ? "secondary" : "ghost"}
                  size="xs"
                  className="h-6 px-3 rounded text-xs font-semibold"
                  onClick={() => setMatchMode("exact")}
                  title="Match only exact key names"
                >
                  Exact
                </Button>
              </div>
            </div>

            {/* Redaction value */}
            <label className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              Replace with:
              <input
                type="text"
                value={redactionValue}
                onChange={(e) => setRedactionValue(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-foreground w-32"
              />
            </label>

            <Button
              variant="ghost"
              size="xs"
              className="h-6 gap-1 px-2 text-muted-foreground hover:text-foreground"
              onClick={loadPresets}
              title="Load built-in sensitive key presets"
            >
              <ShieldCheck className="h-3 w-3" />
              <span>Presets</span>
            </Button>

            {/* Hide all values */}
            <label
              className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground"
              title="Add every key from the input to the sensitive keys list — then remove keys to expose their values"
            >
              <input
                type="checkbox"
                checked={hideAllValues}
                onChange={(e) => handleHideAll(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Hide all values</span>
            </label>

            {/* Auto sanitize toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={autoSanitize}
                onChange={(e) => setAutoSanitize(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Live Sanitize</span>
            </label>
          </div>
        </div>

        {/* Sensitive keys management */}
        <div className="border border-border bg-card p-3 rounded text-xs shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-foreground flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              Sensitive Keys
              <span className="text-muted-foreground font-semibold">
                ({sensitiveKeys.length})
              </span>
            </span>
            <span className="text-muted-foreground">
              {hideAllValues
                ? "Every key from the input is hidden — remove keys below to expose their values."
                : "Values of fields whose key names match these patterns will be redacted."}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {sensitiveKeys.length === 0 ? (
              <p className="text-muted-foreground italic">
                No keys yet — add a key name below or load presets.
              </p>
            ) : (
              sensitiveKeys.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-destructive/25 bg-destructive/5 text-xs font-mono font-semibold text-foreground"
                >
                  {key}
                  <button
                    onClick={() => removeKey(key)}
                    aria-label={`Remove ${key}`}
                    className="text-muted-foreground hover:text-destructive transition-colors focus:outline-none focus:ring-1 focus:ring-foreground rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addKey();
              }}
              placeholder="Add key name, e.g. apiToken"
              className="bg-background border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-foreground w-64 max-w-full placeholder:text-muted-foreground"
            />
            <Button
              onClick={addKey}
              size="xs"
              className="h-7 gap-1 font-semibold"
              disabled={!newKey.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
            {sensitiveKeys.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="h-7 gap-1 text-muted-foreground hover:text-destructive"
                onClick={() => setSensitiveKeys([])}
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Editor workspace */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Original Data
            </label>
            <EditorPanel
              value={input}
              onChange={setInput}
              language="json"
              title="JSON Input"
              sampleText={sampleJSON}
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>

          <div className="flex flex-col min-h-0 gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Sanitized Output
            </label>
            <EditorPanel
              value={output}
              language="json"
              readOnly
              title="Safe to Share"
              downloadFileName="sanitized.json"
              height="fill"
              className="flex-1 min-h-0"
            />
          </div>
        </div>

        {/* File drop zone if empty */}
        {!input && (
          <FileUpload
            accept=".json"
            onFileLoaded={setInput}
            label="Drag and drop your JSON file here, or click to browse"
          />
        )}

        {/* Manual trigger */}
        {!autoSanitize && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleProcess}
              size="sm"
              className="font-semibold rounded shadow-none"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Sanitize JSON
            </Button>
          </div>
        )}

        {/* Diagnostics */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Sanitization Error</p>
              <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {input && !error && validation.valid && stats && (
          <StatusMessage type={stats.redactedCount > 0 ? "success" : "info"}>
            {stats.redactedCount > 0 ? (
              <>
                <ShieldCheck className="h-4 w-4 shrink-0 text-foreground" />
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  <div>
                    <span className="font-semibold text-foreground">
                      {stats.redactedCount} value{stats.redactedCount === 1 ? "" : "s"} redacted.
                    </span>
                  </div>
                  {stats.redactedPaths.length > 0 && (
                    <div className="text-xs text-muted-foreground max-w-xl truncate">
                      Fields:{" "}
                      <strong className="text-foreground">
                        {stats.redactedPaths.join(", ")}
                        {stats.redactedCount > stats.redactedPaths.length && " …"}
                      </strong>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
                <div>
                  <span className="font-semibold text-foreground">
                    No sensitive values found — the output is a copy of the input.
                  </span>
                </div>
              </>
            )}
          </StatusMessage>
        )}

        {input && !error && !validation.valid && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Syntax validation failed</p>
              <p className="text-muted-foreground text-xs mt-0.5">{validation.error}</p>
            </div>
          </StatusMessage>
        )}
      </div>
    </ToolPageLayout>
  );
}
