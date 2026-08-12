import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";
import en from "@/i18n/messages/en.json";
import gu from "@/i18n/messages/gu.json";
import hi from "@/i18n/messages/hi.json";

export type Dictionary = typeof en;

const catalogs: Record<Locale, Dictionary> = {
  en,
  gu: deepMerge(en, gu),
  hi: deepMerge(en, hi),
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(
  base: Dictionary,
  override: Record<string, unknown>,
): Dictionary {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = result[key];
    if (isObject(baseValue) && isObject(value)) {
      result[key] = deepMerge(
        baseValue as Dictionary,
        value,
      ) as unknown as Dictionary[keyof Dictionary];
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as Dictionary;
}

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return catalogs[locale] ?? catalogs[defaultLocale];
}
