import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UsageSnapshot, UsageState } from "../types/provider";
import { ProgressRing } from "./ProgressRing";
import { UsageStats } from "./UsageStats";
import { UsageChart } from "./UsageChart";
import { NavMenu } from "./NavMenu";
import { RefreshIndicator } from "./RefreshIndicator";
import { SettingsPanel } from "./SettingsPanel";
import { formatTimeUntil } from "../lib/format";
import { checkForUpdate } from "../lib/updates";
import { useSettings } from "../hooks/useSettings";
import { t } from "../lib/i18n";

interface ClickPanelProps {
  snapshot: UsageSnapshot;
  state: UsageState;
  lastRefresh: Date | null;
  onRefresh: () => void;
  onClose: () => void;
}

/**
 * Full flyout panel shown on tray icon click.
 * Windows 11 style flyout with usage overview, chart, and navigation.
 */
export function ClickPanel({
  snapshot,
  state,
  lastRefresh,
  onRefresh,
  onClose,
}: ClickPanelProps) {
  const { theme, language, setTheme, setLanguage } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) setShowSettings(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showSettings]);

  return (
    <motion.div
      className="panel w-max flex flex-col"
      style={{ minWidth: "29rem", maxWidth: "35rem" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 cursor-move shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          getCurrentWindow().startDragging();
        }}
      >
        <div className="flex items-center gap-2 pointer-events-none min-w-0">
          <ClaudeLogo />
          <span
            className="text-lg font-bold tracking-tighter truncate"
            style={{
              color: "var(--color-text-primary)",
              fontFamily: "'Courier New', Courier, monospace"
            }}
          >
            BAR<span style={{ color: "var(--color-accent)" }}>_</span>LLM
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {snapshot.account && (
            <span
              className="text-[0.625rem] px-2.5 py-1 rounded-full font-medium"
              style={{
                background: "var(--color-bg-elevated)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-border)",
              }}
            >
              {t(language, "proPlanBadge")}
            </span>
          )}
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-md transition-colors cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-bg-elevated)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="panel-scroll flex min-h-0">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <SettingsPanel
              key="settings"
              theme={theme}
              language={language}
              onThemeChange={setTheme}
              onLanguageChange={setLanguage}
              onClose={() => setShowSettings(false)}
            />
          ) : (
            <motion.div
              key="usage"
              className="flex-1 min-w-0 px-6 py-5 flex flex-col gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Usage Overview */}
              <div>
                <span
                  className="text-xs font-medium mb-3 block"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t(language, "usageOverview")}
                </span>
                <div className="flex items-center gap-4">
                  <ProgressRing
                    percent={snapshot.usedPercent}
                    state={state}
                    size={100}
                    strokeWidth={7}
                    language={language}
                  />
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
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--color-border-subtle)" }} />

              {/* Today's Usage Chart */}
              <UsageChart state={state} history={snapshot.history} language={language} />

              {/* Refresh */}
              <RefreshIndicator lastRefresh={lastRefresh} onRefresh={onRefresh} language={language} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right nav */}
        <div
          className="shrink-0 py-5 px-3.5"
          style={{ borderLeft: "1px solid var(--color-border-subtle)", width: "10.5rem" }}
        >
          <NavMenu
            labels={{
              openClaude: t(language, "navOpenClaude"),
              settings: t(language, "navSettings"),
              checkUpdates: t(language, "navCheckUpdates"),
              exit: t(language, "navExit"),
            }}
            onExit={() => invoke("exit_app")}
            onOpenClaude={() => openUrl("https://console.anthropic.com/settings/limits")}
            onSettings={() => setShowSettings((prev) => !prev)}
            onUpdate={async () => {
              const result = await checkForUpdate();
              const body =
                result.status === "available"
                  ? t(language, "updateAvailableBody").replace("{version}", result.latestVersion)
                  : result.status === "error"
                    ? t(language, "updateCheckErrorBody")
                    : t(language, "upToDateBody");

              if (result.status === "available") {
                openUrl(`https://github.com/Martinnezsavemaiwai/BarLLM/releases/latest`);
              }

              let permissionGranted = await isPermissionGranted();
              if (!permissionGranted) {
                const permission = await requestPermission();
                permissionGranted = permission === 'granted';
              }
              if (permissionGranted) {
                sendNotification({ title: 'BarLLM', body });
              }
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function ClaudeLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 512 512">
      <path d="M447.957 233.579H512v66.176h-64v64.597h-31.723v62.315H384v-62.315h-31.723v62.315H320v-62.315H192v62.315h-32.256v-62.315H128v62.315H95.723v-62.315H64v-64.619H0V233.6h64V106.667h383.957v126.912zm-319.957 0h31.744v-60.736H128v60.736zm224.213 0H384v-60.736h-31.787v60.736z" fill="var(--color-accent)" fillRule="evenodd" clipRule="evenodd" strokeLinejoin="round" strokeMiterlimit={2} />
    </svg>
  );
}
