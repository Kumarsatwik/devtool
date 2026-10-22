"use client";

import { useEffect } from "react";

/** Run a stable callback whenever an auto-run toggle or its inputs change. */
export function useAutoRun(enabled: boolean, run: () => void) {
  useEffect(() => {
    if (enabled) run();
  }, [enabled, run]);
}
