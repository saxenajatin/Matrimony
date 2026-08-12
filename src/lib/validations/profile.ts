import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (value === "" || value === undefined) return null;
  return value;
};

const optionalText = z.preprocess(emptyToNull, z.string().trim().max(200).nullable());
const optionalLongText = z.preprocess(
  emptyToNull,
  z.string().trim().max(2000).nullable(),
);

export const basicProfileSchema = z.object({
  profileFor: z.enum([
    "self",
    "son",
    "daughter",
    "brother",
    "sister",
    "relative",
    "friend",
    "other",
  ]),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  middleName: optionalText,
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
  maritalStatus: z.enum([
    "never_married",
    "divorced",
    "widowed",
    "separated",
    "awaiting_divorce",
  ]),
  aboutMe: optionalLongText,
});

export const locationPhysicalSchema = z.object({
  country: optionalText,
  state: optionalText,
  city: optionalText,
  address: optionalLongText,
  nativeCountry: optionalText,
  nativeState: optionalText,
  nativeCity: optionalText,
  phone: optionalText,
  email: z.preprocess(
    emptyToNull,
    z.string().trim().email("Enter a valid email").nullable(),
  ),
  heightCm: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(100).max(250).nullable(),
  ),
  weightKg: z.preprocess(
    emptyToNull,
    z.coerce.number().min(30).max(300).nullable(),
  ),
  bodyType: optionalText,
  complexion: optionalText,
  bloodGroup: optionalText,
});

export const educationSchema = z.object({
  highestEducation: optionalText,
  degree: optionalText,
  specialization: optionalText,
  institution: optionalText,
  educationCity: optionalText,
  educationCountry: optionalText,
  graduationYear: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1950).max(2100).nullable(),
  ),
  additionalQualification: optionalLongText,
});

export const careerSchema = z.object({
  employmentType: optionalText,
  occupation: optionalText,
  jobTitle: optionalText,
  company: optionalText,
  industry: optionalText,
  workLocation: optionalText,
  country: optionalText,
  state: optionalText,
  city: optionalText,
  annualIncome: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0).max(1_000_000_000).nullable(),
  ),
  incomeCurrency: optionalText,
  experienceYears: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0).max(80).nullable(),
  ),
  businessName: optionalText,
  businessType: optionalText,
});

export const religionSchema = z.object({
  religionId: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  communityId: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  caste: optionalText,
  subCaste: optionalText,
  motherTongueId: z.preprocess(emptyToNull, z.string().uuid().nullable()),
});

export const familySchema = z.object({
  fatherName: optionalText,
  fatherOccupation: optionalText,
  motherName: optionalText,
  motherOccupation: optionalText,
  familyType: z.preprocess(
    emptyToNull,
    z.enum(["nuclear", "joint", "extended"]).nullable(),
  ),
  familyValues: z.preprocess(
    emptyToNull,
    z.enum(["traditional", "moderate", "liberal"]).nullable(),
  ),
  familyStatus: z.preprocess(
    emptyToNull,
    z
      .enum(["middle_class", "upper_middle_class", "affluent", "other"])
      .nullable(),
  ),
  nativePlace: optionalText,
  familyCity: optionalText,
  familyState: optionalText,
  aboutFamily: optionalLongText,
  hasChildren: z.preprocess((value) => {
    if (value === "on" || value === true || value === "true") return true;
    if (value === "" || value === null || value === undefined) return null;
    return false;
  }, z.boolean().nullable()),
  childrenCount: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(20).nullable(),
  ),
});

export const lifestyleSchema = z.object({
  diet: optionalText,
  smoking: optionalText,
  drinking: optionalText,
  exercise: optionalText,
  hobbies: optionalLongText,
  interests: optionalLongText,
  pets: optionalText,
  personality: optionalLongText,
  weekendActivities: optionalLongText,
});

export const preferencesSchema = z.object({
  minAge: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(18).max(100).nullable(),
  ),
  maxAge: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(18).max(100).nullable(),
  ),
  minHeightCm: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(100).max(250).nullable(),
  ),
  maxHeightCm: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(100).max(250).nullable(),
  ),
  preferredGender: optionalText,
  educationPreferences: optionalText,
  occupationPreferences: optionalText,
  dietPreferences: optionalText,
  smokingPreferences: optionalText,
  drinkingPreferences: optionalText,
  familyTypes: optionalText,
  familyValues: optionalText,
  countries: optionalText,
  states: optionalText,
  cities: optionalText,
  religions: optionalText,
  motherTongues: optionalText,
  communities: optionalText,
  manglikPreferences: optionalText,
  rashiPreferences: optionalText,
  nakshatraPreferences: optionalText,
  gotraPreferences: optionalText,
  willingToRelocate: z.preprocess((value) => {
    if (value === "on" || value === true || value === "true") return true;
    if (value === "" || value === null || value === undefined) return null;
    return false;
  }, z.boolean().nullable()),
  notes: optionalLongText,
});

export const familyMemberSchema = z.object({
  relationshipType: z.enum([
    "maternal_uncle",
    "maternal_aunt",
    "paternal_uncle",
    "paternal_aunt",
    "maternal_grandfather",
    "maternal_grandmother",
    "paternal_grandfather",
    "paternal_grandmother",
    "other",
  ]),
  name: optionalText,
  occupation: optionalText,
  location: optionalText,
  maritalStatus: optionalText,
  notes: optionalLongText,
});

export type BasicProfileInput = z.infer<typeof basicProfileSchema>;
export type LocationPhysicalInput = z.infer<typeof locationPhysicalSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type CareerInput = z.infer<typeof careerSchema>;
export type ReligionInput = z.infer<typeof religionSchema>;
export type FamilyInput = z.infer<typeof familySchema>;
export type LifestyleInput = z.infer<typeof lifestyleSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
