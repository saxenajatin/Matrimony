import { z } from "zod";

export const DISCOVER_PAGE_SIZE = 12;

const optionalText = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalInt = (min: number, max: number) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }, z.number().int().min(min).max(max).optional());

export const discoverFiltersSchema = z.object({
  q: optionalText,
  gender: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((value) => (value ? value : undefined)),
  maritalStatus: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value ? value : undefined)),
  ageMin: optionalInt(18, 80),
  ageMax: optionalInt(18, 80),
  city: optionalText,
  state: optionalText,
  country: optionalText,
  religion: optionalText,
  motherTongue: optionalText,
  education: optionalText,
  verifiedOnly: z
    .union([z.literal("1"), z.literal("true"), z.literal("on"), z.boolean()])
    .optional(),
  heightMin: optionalInt(120, 230),
  heightMax: optionalInt(120, 230),
  page: optionalInt(1, 500),
});

export type DiscoverFilters = {
  q?: string;
  gender?: string;
  maritalStatus?: string;
  ageMin?: number;
  ageMax?: number;
  city?: string;
  state?: string;
  country?: string;
  religion?: string;
  motherTongue?: string;
  education?: string;
  verifiedOnly?: boolean;
  heightMin?: number;
  heightMax?: number;
  page: number;
};

export function parseDiscoverSearchParams(
  params: Record<string, string | string[] | undefined>,
): DiscoverFilters {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    raw[key] = Array.isArray(value) ? value[0] : value;
  }

  const parsed = discoverFiltersSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};

  let ageMin = data.ageMin;
  let ageMax = data.ageMax;
  if (ageMin != null && ageMax != null && ageMin > ageMax) {
    [ageMin, ageMax] = [ageMax, ageMin];
  }

  let heightMin = data.heightMin;
  let heightMax = data.heightMax;
  if (heightMin != null && heightMax != null && heightMin > heightMax) {
    [heightMin, heightMax] = [heightMax, heightMin];
  }

  const verifiedRaw = data.verifiedOnly;
  const verifiedOnly =
    verifiedRaw === true ||
    verifiedRaw === "1" ||
    verifiedRaw === "true" ||
    verifiedRaw === "on";

  return {
    q: data.q,
    gender: data.gender,
    maritalStatus: data.maritalStatus,
    ageMin,
    ageMax,
    city: data.city,
    state: data.state,
    country: data.country,
    religion: data.religion,
    motherTongue: data.motherTongue,
    education: data.education,
    verifiedOnly: verifiedOnly || undefined,
    heightMin,
    heightMax,
    page: data.page ?? 1,
  };
}

export function discoverFiltersToQuery(
  filters: DiscoverFilters,
  overrides?: Partial<DiscoverFilters>,
): URLSearchParams {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  const setIf = (key: string, value: string | number | boolean | undefined) => {
    if (value === undefined || value === "" || value === false) return;
    params.set(key, String(value));
  };

  setIf("q", merged.q);
  setIf("gender", merged.gender);
  setIf("maritalStatus", merged.maritalStatus);
  setIf("ageMin", merged.ageMin);
  setIf("ageMax", merged.ageMax);
  setIf("city", merged.city);
  setIf("state", merged.state);
  setIf("country", merged.country);
  setIf("religion", merged.religion);
  setIf("motherTongue", merged.motherTongue);
  setIf("education", merged.education);
  setIf("verifiedOnly", merged.verifiedOnly ? "1" : undefined);
  setIf("heightMin", merged.heightMin);
  setIf("heightMax", merged.heightMax);
  if (merged.page > 1) params.set("page", String(merged.page));

  return params;
}

export function countActiveDiscoverFilters(filters: DiscoverFilters): number {
  let count = 0;
  if (filters.q) count += 1;
  if (filters.gender) count += 1;
  if (filters.maritalStatus) count += 1;
  if (filters.ageMin != null || filters.ageMax != null) count += 1;
  if (filters.city) count += 1;
  if (filters.state) count += 1;
  if (filters.country) count += 1;
  if (filters.religion) count += 1;
  if (filters.motherTongue) count += 1;
  if (filters.education) count += 1;
  if (filters.verifiedOnly) count += 1;
  if (filters.heightMin != null || filters.heightMax != null) count += 1;
  return count;
}
