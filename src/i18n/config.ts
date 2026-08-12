export const locales = ["en", "gu", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  gu: "ગુજરાતી",
  hi: "हिन्दी",
};
