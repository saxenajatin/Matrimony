export const INTEREST_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type InterestStatus = (typeof INTEREST_STATUSES)[number];

export const REPORT_REASON_OPTIONS = [
  { value: "spam", label: "Spam or promotional" },
  { value: "fake_profile", label: "Fake or misleading profile" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "underage", label: "Suspected underage" },
  { value: "other", label: "Other" },
] as const;

export type ReportReasonCode = (typeof REPORT_REASON_OPTIONS)[number]["value"];

export const REPORT_STATUSES = [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];
