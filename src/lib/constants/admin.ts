export const VERIFICATION_TYPES = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "photo", label: "Photo" },
  { value: "identity", label: "Identity" },
  { value: "profile", label: "Profile" },
  { value: "education", label: "Education" },
  { value: "employment", label: "Employment" },
] as const;

export type VerificationType = (typeof VERIFICATION_TYPES)[number]["value"];

export const VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "expired",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
