import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import type { UsageSnapshot, UsageState } from "../types/provider";
import { useSettings } from "./useSettings";
import { t } from "../lib/i18n";

export function useIntegration(snapshot: UsageSnapshot | null, state: UsageState) {
  const previousState = useRef<UsageState | null>(null);
  const highestPercent = useRef<number>(0);
  const { language } = useSettings();

  // Sync Tray Icon
  useEffect(() => {
    if (previousState.current !== state) {
      invoke("set_tray_state", { state }).catch(console.error);
      previousState.current = state;
    }
  }, [state]);

  // Native Notifications
  useEffect(() => {
    if (!snapshot) return;

    const percent = snapshot.usedPercent;

    // Reset highest percent if a new cycle starts (e.g., resetAt passed, or usage dropped)
    if (percent < highestPercent.current - 5) {
      highestPercent.current = 0;
    }

    const checkAndNotify = async (threshold: number, title: string, body: string) => {
      if (percent >= threshold && highestPercent.current < threshold) {
        highestPercent.current = Math.max(highestPercent.current, threshold);

        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === "granted";
        }

        if (permissionGranted) {
          sendNotification({
            title,
            body,
            icon: "icon.ico", // Tauri uses the embedded icon
          });
        }
      }
    };

    const percentBody = (p: number) => t(language, "notifyPercentBody").replace("{percent}", String(Math.floor(p)));

    if (percent >= 100) {
      checkAndNotify(100, t(language, "notifyLimitTitle"), t(language, "notifyLimitBody")).catch(console.error);
    } else if (percent >= 90) {
      checkAndNotify(90, t(language, "notifyCriticalTitle"), percentBody(percent)).catch(console.error);
    } else if (percent >= 80) {
      checkAndNotify(80, t(language, "notifyWarningTitle"), percentBody(percent)).catch(console.error);
    } else if (percent >= 60) {
      checkAndNotify(60, t(language, "notifyUpdateTitle"), percentBody(percent)).catch(console.error);
    }

  }, [snapshot, language]);
}
