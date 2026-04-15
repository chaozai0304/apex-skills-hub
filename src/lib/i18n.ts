export type Locale = "zh" | "en";

export const LOCALE_COOKIE_NAME = "apex_locale";

export function normalizeLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "zh";
}

export function pick<T>(locale: Locale, zh: T, en: T): T {
  return locale === "en" ? en : zh;
}
