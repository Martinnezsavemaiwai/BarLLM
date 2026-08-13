import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import type { UsageSnapshot, UsageState } from "../types/provider";
import { ProgressRing } from "./ProgressRing";
import { UsageStats } from "./UsageStats";
import { RefreshIndicator } from "./RefreshIndicator";
import { formatTimeUntil } from "../lib/format";
import { useSettings } from "../hooks/useSettings";
import { t } from "../lib/i18n";

interface HoverPanelProps {
  snapshot: UsageSnapshot;
  state: UsageState;
  lastRefresh: Date | null;
  onRefresh: () => void;
}

/**
 * Compact quick-preview popup shown on tray icon hover.
 * ~300px wide. Shows the progress ring, stats, reset timer, and model.
 */
export function HoverPanel({
  snapshot,
  state,
  lastRefresh,
  onRefresh,
}: HoverPanelProps) {
  const isHovering = useRef(false);
  const { language } = useSettings();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const unlistenEnter = listen("tray-enter", () => {
      clearTimeout(timeout);
    });

    const unlistenLeave = listen("tray-leave", () => {
      timeout = setTimeout(() => {
        if (!isHovering.current) {
          getCurrentWindow().hide().catch(console.error);
        }
      }, 200);
    });

    return () => {
      unlistenEnter.then((f) => f());
      unlistenLeave.then((f) => f());
    };
  }, []);

  return (
    <motion.div
      className="panel w-max flex flex-col"
      style={{ minWidth: "21rem", maxWidth: "26rem" }}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onMouseEnter={() => (isHovering.current = true)}
      onMouseLeave={() => {
        isHovering.current = false;
        // Also close when mouse leaves the panel itself
        getCurrentWindow().hide().catch(console.error);
      }}
    >
      <div className="panel-scroll p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ClaudeIcon size={16} />
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t(language, "hoverTitle")}
            </span>
          </div>
          {snapshot.account && (
            <span
              className="text-[0.625rem] px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{
                background: "var(--color-bg-elevated)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 0 10px 0 color-mix(in srgb, var(--color-accent) 20%, transparent)",
              }}
            >
              {t(language, "proBadge")}
            </span>
          )}
        </div>

        {/* Ring + stats side by side */}
        <div className="flex items-center gap-4">
          <ProgressRing percent={snapshot.usedPercent} state={state} size={96} strokeWidth={6} language={language} />
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <UsageStats snapshot={snapshot} language={language} />

            {snapshot.resetAt && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="truncate">{t(language, "resetsIn")} {formatTimeUntil(snapshot.resetAt)}</span>
              </div>
            )}

            {snapshot.currentModel && (
              <div className="flex items-center gap-1.5 text-xs overflow-hidden" style={{ color: "var(--color-text-secondary)" }}>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: "var(--color-accent)" }}
                />
                <span className="truncate" title={snapshot.currentModel}>
                  {snapshot.currentModel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Refresh */}
        <RefreshIndicator lastRefresh={lastRefresh} onRefresh={onRefresh} language={language} />
      </div>
    </motion.div>
  );
}

function ClaudeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <path d="M447.957 233.579H512v66.176h-64v64.597h-31.723v62.315H384v-62.315h-31.723v62.315H320v-62.315H192v62.315h-32.256v-62.315H128v62.315H95.723v-62.315H64v-64.619H0V233.6h64V106.667h383.957v126.912zm-319.957 0h31.744v-60.736H128v60.736zm224.213 0H384v-60.736h-31.787v60.736z" fill="var(--color-accent)" fillRule="evenodd" clipRule="evenodd" strokeLinejoin="round" strokeMiterlimit={2} />
    </svg>
  );
}
