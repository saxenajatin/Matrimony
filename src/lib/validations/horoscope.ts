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

export const horoscopeSchema = z.object({
  birthDate: z.preprocess(emptyToNull, z.string().nullable()),
  birthTime: z.preprocess(emptyToNull, z.string().nullable()),
  birthPlace: optionalText,
  birthCity: optionalText,
  birthState: optionalText,
  birthCountry: optionalText,
  rashi: optionalText,
  nakshatra: optionalText,
  nakshatraPada: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1).max(4).nullable(),
  ),
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
