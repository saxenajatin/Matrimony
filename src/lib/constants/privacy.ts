export const PHOTO_BUCKET = "amvs-profile-photos";
export const MAX_PROFILE_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const PRIVACY_TOGGLES = [
  {
    key: "ProfileVisible",
    label: "Profile visible in search",
    description: "Hide your profile from Discover entirely when off.",
  },
  {
    key: "ShowPhotos",
    label: "Show photos",
    description: "Allow others to see your profile photos.",
  },
  {
    key: "ShowPhone",
    label: "Show phone",
    description: "Private by default.",
  },
  {
    key: "ShowEmail",
    label: "Show email",
    description: "Private by default.",
  },
  {
    key: "ShowIncome",
    label: "Show income",
    description: "Private by default.",
  },
  {
    key: "ShowFamilyDetails",
    label: "Show family details",
    description: "Parents and family background on your public profile.",
  },
  {
    key: "ShowReligion",
    label: "Show religion",
    description: "Religion and mother tongue on your public profile.",
  },
  {
    key: "ShowCaste",
    label: "Show caste",
    description: "Private by default.",
  },
  {
    key: "ShowHoroscope",
    label: "Show horoscope",
    description: "Rashi, Nakshatra, Manglik, Gotra and birth details.",
  },
  {
    key: "ShowKundli",
    label: "Show Kundli",
    description: "Private by default. Allows others to open uploaded Kundli files.",
  },
  {
    key: "ShowChildren",
    label: "Show children details",
    description: "Private by default.",
  },
  {
    key: "AllowProfileViews",
    label: "Allow profile views",
    description: "Let members open your full profile page.",
  },
  {
    key: "AllowInterests",
    label: "Allow interests",
    description: "Let members send you interest requests.",
  },
  {
    key: "AllowMessages",
    label: "Allow messages",
    description: "Used after a connection is accepted.",
  },
] as const;

export type PrivacyToggleKey = (typeof PRIVACY_TOGGLES)[number]["key"];

export const DEFAULT_PRIVACY: Record<PrivacyToggleKey, boolean> = {
  ProfileVisible: true,
  ShowPhotos: true,
  ShowPhone: false,
  ShowEmail: false,
  ShowIncome: false,
  ShowFamilyDetails: true,
  ShowReligion: true,
  ShowCaste: false,
  ShowHoroscope: false,
  ShowKundli: false,
  ShowChildren: false,
  AllowProfileViews: true,
  AllowInterests: true,
  AllowMessages: true,
};
