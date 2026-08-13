import { useState, useEffect, useCallback, useRef } from "react";
import type { Provider, UsageSnapshot, UsageState } from "../types/provider";
import { deriveUsageState } from "../lib/usage-state";

interface UseUsageResult {
  snapshot: UsageSnapshot | null;
  state: UsageState;
  error: string | null;
  refresh: () => void;
  lastRefresh: Date | null;
}

/**
 * Poll a Provider for usage data. Auto-refreshes on an interval.
 * Returns the current snapshot, derived state, and a manual refresh function.
 */
export function useUsage(
  provider: Provider,
  intervalMs = 60_000,
): UseUsageResult {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [state, setState] = useState<UsageState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const usage = await provider.getUsage();
      setSnapshot(usage);
      setState(deriveUsageState(usage.usedPercent));
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "FileNotFoundError") {
        setState("no_access");
        setError("Provider not logged in or no usage data found");
      } else {
        setState("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
  }, [provider]);

  // Initial fetch + interval
  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh, intervalMs]);

  return { snapshot, state, error, refresh, lastRefresh };
}
