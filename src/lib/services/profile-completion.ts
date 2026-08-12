import { COMPLETION_WEIGHTS } from "@/lib/constants/profile";

export type CompletionInput = {
  hasBasic: boolean;
  hasAboutMe: boolean;
  hasEducationOrCareer: boolean;
  hasFamily: boolean;
  hasLifestyle: boolean;
  hasPreferences: boolean;
  hasPhoto?: boolean;
};

export type CompletionBreakdown = {
  total: number;
  sections: {
    key: keyof typeof COMPLETION_WEIGHTS;
    label: string;
    weight: number;
    earned: number;
    complete: boolean;
  }[];
};

export function calculateProfileCompletion(
  input: CompletionInput,
): CompletionBreakdown {
  const sections = [
    {
      key: "basic" as const,
      label: "Basic information",
      weight: COMPLETION_WEIGHTS.basic,
      complete: input.hasBasic,
    },
    {
      key: "photo" as const,
      label: "Photo",
      weight: COMPLETION_WEIGHTS.photo,
      complete: Boolean(input.hasPhoto),
    },
    {
      key: "educationCareer" as const,
      label: "Education / career",
      weight: COMPLETION_WEIGHTS.educationCareer,
      complete: input.hasEducationOrCareer,
    },
    {
      key: "family" as const,
      label: "Family",
      weight: COMPLETION_WEIGHTS.family,
      complete: input.hasFamily,
    },
    {
      key: "lifestyle" as const,
      label: "Lifestyle",
      weight: COMPLETION_WEIGHTS.lifestyle,
      complete: input.hasLifestyle,
    },
    {
      key: "aboutMe" as const,
      label: "About me",
      weight: COMPLETION_WEIGHTS.aboutMe,
      complete: input.hasAboutMe,
    },
    {
      key: "partnerPreferences" as const,
      label: "Partner preferences",
      weight: COMPLETION_WEIGHTS.partnerPreferences,
      complete: input.hasPreferences,
    },
  ];

  const withEarned = sections.map((section) => ({
    ...section,
    earned: section.complete ? section.weight : 0,
  }));

  const total = withEarned.reduce((sum, section) => sum + section.earned, 0);

  return { total, sections: withEarned };
}

export function hasAnyValue(record: Record<string, unknown> | null | undefined) {
  if (!record) return false;
  return Object.entries(record).some(([key, value]) => {
    if (
      key === "Id" ||
      key === "UserId" ||
      key === "ProfileId" ||
      key === "CreatedAt" ||
      key === "UpdatedAt"
    ) {
      return false;
    }
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
}
