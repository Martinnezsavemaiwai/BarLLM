import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import type { Theme, Language } from "../hooks/useSettings";
import { t } from "../lib/i18n";

interface SettingsPanelProps {
  theme: Theme;
  language: Language;
  onThemeChange: (theme: Theme) => void;
  onLanguageChange: (language: Language) => void;
  onClose: () => void;
}

const THEMES: Theme[] = ["dark", "light"];
const THEME_KEYS = { dark: "themeDark", light: "themeLight" } as const;
const LANGUAGES: Language[] = ["en", "th"];
const LANGUAGE_KEYS = { en: "languageEn", th: "languageTh" } as const;

/**
 * Inline settings overlay — theme and language pickers.
 * Replaces the ClickPanel body when open; closes back to the usage view.
 */
export function SettingsPanel({ theme, language, onThemeChange, onLanguageChange, onClose }: SettingsPanelProps) {
  const [autostart, setAutostart] = useState<boolean | null>(null);

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => setAutostart(false));
  }, []);

  const toggleAutostart = async () => {
    if (autostart === null) return;
    try {
      if (autostart) await disable();
      else await enable();
      setAutostart(!autostart);
    } catch {
      // Leave state unchanged if the OS registration fails
    }
  };

  return (
    <motion.div
      className="flex-1 min-w-0 px-6 py-5 flex flex-col gap-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {t(language, "settingsTitle")}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md transition-colors cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--color-bg-elevated)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          title={t(language, "close")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {t(language, "settingsTheme")}
        </span>
        <div className="flex gap-2">
          {THEMES.map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => onThemeChange(themeOption)}
              className="flex-1 text-xs py-2 rounded-lg transition-colors cursor-pointer"
              style={{
                background: theme === themeOption ? "var(--color-bg-elevated)" : "transparent",
                color: theme === themeOption ? "var(--color-accent)" : "var(--color-text-secondary)",
                border: `1px solid ${theme === themeOption ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
              }}
            >
              {t(language, THEME_KEYS[themeOption])}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {t(language, "settingsLanguage")}
        </span>
        <div className="flex gap-2">
          {LANGUAGES.map((languageOption) => (
            <button
              key={languageOption}
              onClick={() => onLanguageChange(languageOption)}
              className="flex-1 text-xs py-2 rounded-lg transition-colors cursor-pointer"
              style={{
                background: language === languageOption ? "var(--color-bg-elevated)" : "transparent",
                color: language === languageOption ? "var(--color-accent)" : "var(--color-text-secondary)",
                border: `1px solid ${language === languageOption ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
              }}
            >
              {t(language, LANGUAGE_KEYS[languageOption])}
            </button>
          ))}
        </div>
      </div>

      <label
        className="flex items-center justify-between text-xs cursor-pointer py-1"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {t(language, "settingsStartWithWindows")}
        <input
          type="checkbox"
          checked={autostart ?? false}
          disabled={autostart === null}
          onChange={toggleAutostart}
          className="accent-[var(--color-accent)]"
        />
      </label>
    </motion.div>
  );
}
