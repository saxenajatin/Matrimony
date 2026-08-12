/**
 * Configurable matrimonial preference weights (percent).
 * Dimensions without viewer preferences are skipped and weight redistributed.
 * Missing candidate data does not auto-fail a dimension.
 * Horoscope is reserved for Phase 8 and skipped when unavailable.
 */
export const MATCH_WEIGHTS = {
  age: 15,
  location: 10,
  religion: 10,
  community: 10,
  education: 10,
  career: 10,
  lifestyle: 10,
  family: 5,
  motherTongue: 5,
  horoscope: 10,
  height: 5,
} as const;

export type MatchDimensionKey = keyof typeof MATCH_WEIGHTS;

export const MATCH_DIMENSION_LABELS: Record<MatchDimensionKey, string> = {
  age: "Age",
  location: "Location",
  religion: "Religion",
  community: "Community",
  education: "Education",
  career: "Career",
  lifestyle: "Lifestyle",
  family: "Family",
  motherTongue: "Mother tongue",
  horoscope: "Horoscope",
  height: "Height",
};
