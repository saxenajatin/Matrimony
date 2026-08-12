import {
  MATCH_DIMENSION_LABELS,
  MATCH_WEIGHTS,
  type MatchDimensionKey,
} from "@/lib/constants/matching";

export type PartnerPreferencesRow = {
  MinAge?: number | null;
  MaxAge?: number | null;
  MinHeightCm?: number | null;
  MaxHeightCm?: number | null;
  PreferredGender?: string | null;
  MaritalStatuses?: string[] | null;
  EducationPreferences?: string | null;
  OccupationPreferences?: string | null;
  DietPreferences?: string | null;
  SmokingPreferences?: string | null;
  DrinkingPreferences?: string | null;
  FamilyTypes?: string | null;
  FamilyValues?: string | null;
  Countries?: string | null;
  States?: string | null;
  Cities?: string | null;
  Religions?: string | null;
  MotherTongues?: string | null;
  Communities?: string | null;
  ManglikPreferences?: string | null;
  RashiPreferences?: string | null;
  NakshatraPreferences?: string | null;
  GotraPreferences?: string | null;
  WillingToRelocate?: boolean | null;
  Notes?: string | null;
};

export type MatchCandidateFacts = {
  UserId: string;
  Gender?: string | null;
  Age?: number | null;
  HeightCm?: number | null;
  MaritalStatus?: string | null;
  City?: string | null;
  State?: string | null;
  Country?: string | null;
  Religion?: string | null;
  MotherTongue?: string | null;
  Community?: string | null;
  Education?: string | null;
  Occupation?: string | null;
  Diet?: string | null;
  Smoking?: string | null;
  Drinking?: string | null;
  FamilyType?: string | null;
  FamilyValues?: string | null;
  ManglikStatus?: string | null;
  Rashi?: string | null;
  Nakshatra?: string | null;
  Gotra?: string | null;
  HoroscopeAvailable?: boolean;
};

export type MatchDimensionResult = {
  key: MatchDimensionKey;
  label: string;
  weight: number;
  status: "matched" | "unmatched" | "skipped";
  detail?: string;
};

export type MatchScoreResult = {
  matchScore: number;
  matchedPreferences: MatchDimensionResult[];
  unmatchedPreferences: MatchDimensionResult[];
  skippedPreferences: MatchDimensionResult[];
  dimensions: MatchDimensionResult[];
  hasActivePreferences: boolean;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function preferenceTokens(value: string | null | undefined): string[] {
  if (!hasText(value)) return [];
  return value
    .split(/[,;/|]+/)
    .map((part) => normalize(part))
    .filter(Boolean);
}

function textMatchesPreference(
  candidateValue: string | null | undefined,
  preference: string | null | undefined,
): boolean | null {
  const tokens = preferenceTokens(preference);
  if (tokens.length === 0) return null;
  if (!hasText(candidateValue)) return null;
  const haystack = normalize(candidateValue);
  return tokens.some(
    (token) => haystack.includes(token) || token.includes(haystack),
  );
}

function inRange(
  value: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): boolean | null {
  if (min == null && max == null) return null;
  if (value == null || Number.isNaN(value)) return null;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function dimension(
  key: MatchDimensionKey,
  status: MatchDimensionResult["status"],
  detail?: string,
): MatchDimensionResult {
  return {
    key,
    label: MATCH_DIMENSION_LABELS[key],
    weight: MATCH_WEIGHTS[key],
    status,
    detail,
  };
}

function statusFromBoolean(value: boolean | null): MatchDimensionResult["status"] {
  if (value === true) return "matched";
  if (value === false) return "unmatched";
  return "skipped";
}

export function calculateMatchScore(
  preferences: PartnerPreferencesRow | null | undefined,
  candidate: MatchCandidateFacts,
): MatchScoreResult {
  const prefs = preferences ?? {};

  const ageMatch = inRange(candidate.Age, prefs.MinAge ?? null, prefs.MaxAge ?? null);
  const heightMatch = inRange(
    candidate.HeightCm,
    prefs.MinHeightCm ?? null,
    prefs.MaxHeightCm ?? null,
  );

  let genderStatus: MatchDimensionResult["status"] = "skipped";
  if (hasText(prefs.PreferredGender)) {
    if (!hasText(candidate.Gender)) genderStatus = "skipped";
    else {
      genderStatus =
        normalize(candidate.Gender) === normalize(prefs.PreferredGender)
          ? "matched"
          : "unmatched";
    }
  }

  const maritalTokens = (prefs.MaritalStatuses ?? [])
    .map((item) => normalize(String(item)))
    .filter(Boolean);
  let maritalStatus: MatchDimensionResult["status"] = "skipped";
  if (maritalTokens.length > 0) {
    if (!hasText(candidate.MaritalStatus)) maritalStatus = "skipped";
    else {
      maritalStatus = maritalTokens.includes(normalize(candidate.MaritalStatus))
        ? "matched"
        : "unmatched";
    }
  }

  const cityMatch = textMatchesPreference(candidate.City, prefs.Cities);
  const stateMatch = textMatchesPreference(candidate.State, prefs.States);
  const countryMatch = textMatchesPreference(candidate.Country, prefs.Countries);
  let locationStatus: MatchDimensionResult["status"] = "skipped";
  if (cityMatch !== null || stateMatch !== null || countryMatch !== null) {
    const checks = [cityMatch, stateMatch, countryMatch].filter(
      (value): value is boolean => value !== null,
    );
    locationStatus = checks.some(Boolean) ? "matched" : "unmatched";
  }

  const religionMatch = textMatchesPreference(candidate.Religion, prefs.Religions);
  const communityMatch = textMatchesPreference(
    candidate.Community,
    prefs.Communities,
  );
  const motherTongueMatch = textMatchesPreference(
    candidate.MotherTongue,
    prefs.MotherTongues,
  );
  const educationMatch = textMatchesPreference(
    candidate.Education,
    prefs.EducationPreferences,
  );
  const careerMatch = textMatchesPreference(
    candidate.Occupation,
    prefs.OccupationPreferences,
  );

  const dietMatch = textMatchesPreference(candidate.Diet, prefs.DietPreferences);
  const smokingMatch = textMatchesPreference(
    candidate.Smoking,
    prefs.SmokingPreferences,
  );
  const drinkingMatch = textMatchesPreference(
    candidate.Drinking,
    prefs.DrinkingPreferences,
  );
  let lifestyleStatus: MatchDimensionResult["status"] = "skipped";
  if (dietMatch !== null || smokingMatch !== null || drinkingMatch !== null) {
    const checks = [dietMatch, smokingMatch, drinkingMatch].filter(
      (value): value is boolean => value !== null,
    );
    lifestyleStatus = checks.every(Boolean) ? "matched" : "unmatched";
  }

  const familyTypeMatch = textMatchesPreference(
    candidate.FamilyType,
    prefs.FamilyTypes,
  );
  const familyValuesMatch = textMatchesPreference(
    candidate.FamilyValues,
    prefs.FamilyValues,
  );
  let familyStatus: MatchDimensionResult["status"] = "skipped";
  if (familyTypeMatch !== null || familyValuesMatch !== null) {
    const checks = [familyTypeMatch, familyValuesMatch].filter(
      (value): value is boolean => value !== null,
    );
    familyStatus = checks.every(Boolean) ? "matched" : "unmatched";
  }

  // Horoscope: score only when preferences are set AND candidate has data.
  // Missing data never auto-fails.
  const manglikMatch = textMatchesPreference(
    candidate.ManglikStatus,
    prefs.ManglikPreferences,
  );
  const rashiMatch = textMatchesPreference(candidate.Rashi, prefs.RashiPreferences);
  const nakshatraMatch = textMatchesPreference(
    candidate.Nakshatra,
    prefs.NakshatraPreferences,
  );
  const gotraMatch = textMatchesPreference(candidate.Gotra, prefs.GotraPreferences);
  let horoscopeStatus: MatchDimensionResult["status"] = "skipped";
  if (
    manglikMatch !== null ||
    rashiMatch !== null ||
    nakshatraMatch !== null ||
    gotraMatch !== null
  ) {
    const checks = [manglikMatch, rashiMatch, nakshatraMatch, gotraMatch].filter(
      (value): value is boolean => value !== null,
    );
    horoscopeStatus = checks.every(Boolean) ? "matched" : "unmatched";
  } else if (!candidate.HoroscopeAvailable) {
    horoscopeStatus = "skipped";
  }

  const dimensions: MatchDimensionResult[] = [
    dimension("age", statusFromBoolean(ageMatch)),
    dimension("location", locationStatus),
    dimension("religion", statusFromBoolean(religionMatch)),
    dimension("community", statusFromBoolean(communityMatch)),
    dimension("education", statusFromBoolean(educationMatch)),
    dimension("career", statusFromBoolean(careerMatch)),
    dimension("lifestyle", lifestyleStatus),
    dimension("family", familyStatus),
    dimension("motherTongue", statusFromBoolean(motherTongueMatch)),
    dimension(
      "horoscope",
      horoscopeStatus,
      horoscopeStatus === "skipped"
        ? "Optional — skipped when unset or unavailable"
        : undefined,
    ),
    dimension("height", statusFromBoolean(heightMatch)),
  ];

  // Preferred gender acts as a hard preference using a virtual unmatched on age
  // weight share when set and mismatched — applied after redistribution below.
  const active = dimensions.filter((item) => item.status !== "skipped");
  const hasActivePreferences =
    active.length > 0 ||
    hasText(prefs.PreferredGender) ||
    maritalTokens.length > 0;

  let matchScore = 0;
  if (active.length === 0) {
    matchScore = hasText(prefs.PreferredGender)
      ? genderStatus === "matched"
        ? 100
        : genderStatus === "unmatched"
          ? 0
          : 50
      : 0;
  } else {
    const totalWeight = active.reduce((sum, item) => sum + item.weight, 0);
    const earned = active
      .filter((item) => item.status === "matched")
      .reduce((sum, item) => sum + item.weight, 0);
    matchScore = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

    if (genderStatus === "unmatched") {
      matchScore = Math.max(0, Math.round(matchScore * 0.35));
    } else if (genderStatus === "matched") {
      matchScore = Math.min(100, matchScore);
    }

    if (maritalStatus === "unmatched") {
      matchScore = Math.max(0, Math.round(matchScore * 0.7));
    }
  }

  return {
    matchScore,
    matchedPreferences: dimensions.filter((item) => item.status === "matched"),
    unmatchedPreferences: dimensions.filter(
      (item) => item.status === "unmatched",
    ),
    skippedPreferences: dimensions.filter((item) => item.status === "skipped"),
    dimensions,
    hasActivePreferences,
  };
}
