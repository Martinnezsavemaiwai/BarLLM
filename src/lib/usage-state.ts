import type { UsageState } from "../types/provider";

/** Derive the usage state from a percentage value (0–100). */
export function deriveUsageState(percent: number): UsageState {
  if (percent < 0 || Number.isNaN(percent)) return "error";
  if (percent >= 100) return "full";
  if (percent >= 90) return "critical";
  if (percent >= 60) return "warning";
  return "good";
}

/** Map a UsageState to its CSS custom property color. */
export function stateColor(state: UsageState): string {
  switch (state) {
    case "good":
      return "var(--color-status-good)";
    case "warning":
      return "var(--color-status-warning)";
    case "critical":
    case "full":
      return "var(--color-status-critical)";
    case "no_access":
    case "loading":
    case "error":
      return "var(--color-status-disabled)";
  }
}

/** Human-readable label for a usage state. */
export function stateLabel(state: UsageState): string {
  switch (state) {
    case "good":
      return "Good";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    case "full":
      return "Fully Used";
    case "no_access":
      return "No Access";
    case "loading":
      return "Loading…";
    case "error":
      return "Error";
  }
}
