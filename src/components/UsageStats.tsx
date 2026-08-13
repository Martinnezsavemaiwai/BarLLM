import type { UsageSnapshot } from "../types/provider";
import { formatNumber } from "../lib/format";
import type { Language } from "../hooks/useSettings";
import { t } from "../lib/i18n";

interface UsageStatsProps {
  snapshot: UsageSnapshot;
  language?: Language;
}

/**
 * Displays usage numbers — adapts to what data the source provides.
 * Shows absolute numbers only if `used` and `limit` are available.
 */
export function UsageStats({ snapshot, language = "en" }: UsageStatsProps) {
  const isHybrid = snapshot.source === "hybrid";
  const hasAbsolute = snapshot.used != null && snapshot.limit != null;

  return (
    <div className="flex flex-col gap-1 min-w-0">
      {isHybrid ? (
        <>
          <div
            className="text-sm truncate font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {snapshot.usedPercent.toFixed(1)}% {t(language, "usedPercentAllModels")}
          </div>
          <div className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
            {t(language, "liveApiSyncActive")}
          </div>
        </>
      ) : hasAbsolute ? (
        <>
          <div
            className="text-sm truncate"
            style={{ color: "var(--color-text-primary)" }}
            title={`${formatNumber(snapshot.used!)} / ${formatNumber(snapshot.limit!)}`}
          >
            <span className="font-semibold">
              {formatNumber(snapshot.used!)} / {formatNumber(snapshot.limit!)}
            </span>
          </div>
          <div className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
            {formatNumber(snapshot.limit! - snapshot.used!)} {t(language, "remainingLocalOnly")}
          </div>
        </>
      ) : null}
    </div>
  );
}
