export const PROFILE_FOR_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "relative", label: "Relative" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: "never_married", label: "Never Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "awaiting_divorce", label: "Awaiting Divorce" },
] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "government", label: "Government" },
  { value: "business", label: "Business" },
  { value: "self_employed", label: "Self Employed" },
  { value: "professional", label: "Professional" },
  { value: "ngo", label: "NGO" },
  { value: "freelancer", label: "Freelancer" },
  { value: "student", label: "Student" },
  { value: "homemaker", label: "Homemaker" },
  { value: "retired", label: "Retired" },
  { value: "not_working", label: "Not Working" },
  { value: "other", label: "Other" },
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  { value: "10th", label: "10th" },
  { value: "12th", label: "12th" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "mba", label: "MBA" },
  { value: "mca", label: "MCA" },
  { value: "engineering", label: "Engineering" },
  { value: "mbbs", label: "MBBS" },
  { value: "md", label: "MD" },
  { value: "ca", label: "CA" },
  { value: "cs", label: "CS" },
  { value: "law", label: "Law" },
  { value: "phd", label: "PhD" },
  { value: "other", label: "Other" },
] as const;

export const DIET_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "jain_vegetarian", label: "Jain Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "non_vegetarian", label: "Non-Vegetarian" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const HABIT_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "occasionally", label: "Occasionally" },
  { value: "regularly", label: "Regularly" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const FAMILY_TYPE_OPTIONS = [
  { value: "nuclear", label: "Nuclear" },
  { value: "joint", label: "Joint" },
  { value: "extended", label: "Extended" },
] as const;

export const FAMILY_VALUES_OPTIONS = [
  { value: "traditional", label: "Traditional" },
  { value: "moderate", label: "Moderate" },
  { value: "liberal", label: "Liberal" },
] as const;

export const FAMILY_STATUS_OPTIONS = [
  { value: "middle_class", label: "Middle Class" },
  { value: "upper_middle_class", label: "Upper Middle Class" },
  { value: "affluent", label: "Affluent" },
  { value: "other", label: "Other" },
] as const;

export const EXTENDED_RELATIONSHIP_OPTIONS = [
  { value: "maternal_uncle", label: "Maternal Uncle" },
  { value: "maternal_aunt", label: "Maternal Aunt" },
  { value: "paternal_uncle", label: "Paternal Uncle" },
  { value: "paternal_aunt", label: "Paternal Aunt" },
  { value: "maternal_grandfather", label: "Maternal Grandfather" },
  { value: "maternal_grandmother", label: "Maternal Grandmother" },
  { value: "paternal_grandfather", label: "Paternal Grandfather" },
  { value: "paternal_grandmother", label: "Paternal Grandmother" },
  { value: "other", label: "Other" },
] as const;

/** Spec weights. Photo reserved for Phase 3 (not required to activate). */
export const COMPLETION_WEIGHTS = {
  basic: 20,
  photo: 15,
  educationCareer: 15,
  family: 10,
  lifestyle: 10,
  aboutMe: 10,
  partnerPreferences: 20,
} as const;

export const ONBOARDING_STEPS = [
  { id: "basic", label: "Basic" },
  { id: "location", label: "Location & physical" },
  { id: "education", label: "Education" },
  { id: "career", label: "Career" },
  { id: "religion", label: "Religion" },
  { id: "family", label: "Family" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "horoscope", label: "Horoscope" },
  { id: "preferences", label: "Preferences" },
  { id: "review", label: "Review" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];
