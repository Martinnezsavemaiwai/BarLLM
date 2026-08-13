import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light";
export type Language = "en" | "th";

interface Settings {
  theme: Theme;
  language: Language;
}

const STORAGE_KEY = "barllm-settings";
const DEFAULT_SETTINGS: Settings = { theme: "dark", language: "en" };

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      language: parsed.language === "th" ? "th" : "en",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

/**
 * Theme + language, persisted to localStorage and synced live across
 * BarLLM's separate hover/click windows via the native `storage` event
 * (fires in other same-origin windows automatically — no IPC needed).
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(readSettings);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSettings(readSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    theme: settings.theme,
    language: settings.language,
    setTheme: (theme: Theme) => update({ theme }),
    setLanguage: (language: Language) => update({ language }),
  };
}
