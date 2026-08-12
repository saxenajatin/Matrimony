export const MANGLIK_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "anshik", label: "Anshik" },
  { value: "dont_know", label: "Don't know" },
] as const;

export const RASHI_OPTIONS = [
  { value: "mesha", label: "Mesha (Aries)" },
  { value: "vrishabha", label: "Vrishabha (Taurus)" },
  { value: "mithuna", label: "Mithuna (Gemini)" },
  { value: "karka", label: "Karka (Cancer)" },
  { value: "simha", label: "Simha (Leo)" },
  { value: "kanya", label: "Kanya (Virgo)" },
  { value: "tula", label: "Tula (Libra)" },
  { value: "vrischika", label: "Vrischika (Scorpio)" },
  { value: "dhanu", label: "Dhanu (Sagittarius)" },
  { value: "makara", label: "Makara (Capricorn)" },
  { value: "kumbha", label: "Kumbha (Aquarius)" },
  { value: "meena", label: "Meena (Pisces)" },
] as const;

export const NAKSHATRA_OPTIONS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
].map((name) => ({
  value: name.toLowerCase().replace(/\s+/g, "_"),
  label: name,
}));

export const KUNDLI_BUCKET = "amvs-kundli";
export const MAX_KUNDLI_BYTES = 10 * 1024 * 1024;
export const MAX_KUNDLI_FILES = 3;
export const ALLOWED_KUNDLI_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;
