import { MANGLIK_OPTIONS, RASHI_OPTIONS } from "@/lib/constants/horoscope";

export function formatManglik(value: string | null | undefined) {
  if (!value) return null;
  return (
    MANGLIK_OPTIONS.find((item) => item.value === value)?.label ?? value
  );
}

export function formatRashi(value: string | null | undefined) {
  if (!value) return null;
  return RASHI_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function formatNakshatra(value: string | null | undefined) {
  if (!value) return null;
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
