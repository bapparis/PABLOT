export const SUPPORTED_LANGUAGES = ["en", "fr", "ar", "hi"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_META: Record<
  Language,
  { label: string; flag: string; dir: "ltr" | "rtl" }
> = {
  en: { label: "English", flag: "🇬🇧", dir: "ltr" },
  fr: { label: "Français", flag: "🇫🇷", dir: "ltr" },
  ar: { label: "العربية", flag: "🇸🇦", dir: "rtl" },
  hi: { label: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
};

export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}
