"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initTelegramWebApp } from "@/lib/telegram";
import { isLanguage, LANGUAGE_META, type Language } from "./config";
import { translations } from "./translations";

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: string) => string;
  direction: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    let active = true;

    async function loadLanguage() {
      try {
        const webApp = initTelegramWebApp();

        if (!webApp?.initData) {
          return;
        }

        const response = await fetch("/api/telegram/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initData: webApp.initData,
          }),
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (active && isLanguage(data?.user?.language)) {
          setLanguageState(data.user.language);
        }
      } catch {
        // Keep English as the safe fallback.
      }
    }

    loadLanguage();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const meta = LANGUAGE_META[language];

    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
  }, [language]);

  const setLanguage = useCallback(async (nextLanguage: Language) => {
    if (nextLanguage === language) {
      return;
    }

    const webApp = initTelegramWebApp();

    if (!webApp?.initData) {
      throw new Error("Telegram session unavailable");
    }

    const response = await fetch("/api/telegram/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: webApp.initData,
        language: nextLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to save language");
    }

    setLanguageState(nextLanguage);
  }, [language]);

  const t = useCallback(
    (key: string) => translations[language][key] ?? translations.en[key] ?? key,
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      direction: LANGUAGE_META[language].dir,
    }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
