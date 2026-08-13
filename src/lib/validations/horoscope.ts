import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (value === "" || value === undefined) return null;
  return value;
};

const optionalText = z.preprocess(
  emptyToNull,
  z.string().trim().max(120).nullable(),
);

const optionalLongText = z.preprocess(
  emptyToNull,
  z.string().trim().max(2000).nullable(),
);

/** Avoid z.coerce.number() turning empty/null into 0 (fails min(1)). */
const optionalPada = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}, z.number().int().min(1).max(4).nullable());

export const horoscopeSchema = z.object({
  birthDate: z.preprocess(emptyToNull, z.string().nullable()),
  birthTime: z.preprocess(emptyToNull, z.string().nullable()),
  birthPlace: optionalText,
  birthCity: optionalText,
  birthState: optionalText,
  birthCountry: optionalText,
  rashi: optionalText,
  nakshatra: optionalText,
  nakshatraPada: optionalPada,
  lagna: optionalText,
  manglikStatus: z.preprocess(
    emptyToNull,
    z.enum(["yes", "no", "anshik", "dont_know"]).nullable(),
  ),
  nadi: optionalText,
  gan: optionalText,
  gotra: optionalText,
  kuldevi: optionalText,
  kuldevta: optionalText,
  veda: optionalText,
  charan: optionalText,
  notes: optionalLongText,
});

export type HoroscopeInput = z.infer<typeof horoscopeSchema>;
