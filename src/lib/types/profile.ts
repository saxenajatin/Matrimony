import type { PrivacyToggleKey } from "@/lib/constants/privacy";
import type { calculateProfileCompletion } from "@/lib/services/profile-completion";

export type LookupItem = {
  Id: string;
  Code: string;
  Name: string;
};

export type ProfilePhotoView = {
  Id: string;
  UserId: string;
  StoragePath: string;
  FileName: string;
  FileType: string;
  FileSizeBytes: number | null;
  IsPrimary: boolean;
  SortOrder: number;
  ModerationStatus: string;
  SignedUrl?: string | null;
};

export type KundliDocumentView = {
  Id: string;
  UserId: string;
  StoragePath: string;
  FileName: string;
  FileType: string;
  FileSizeBytes: number | null;
  IsPrivate: boolean;
  SignedUrl?: string | null;
};

export type ProfileBundle = {
  profile: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  physical: Record<string, unknown> | null;
  education: Record<string, unknown> | null;
  career: Record<string, unknown> | null;
  religion: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
  lifestyle: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  siblings: Record<string, unknown>[];
  familyMembers: Record<string, unknown>[];
  photos: ProfilePhotoView[];
  horoscope: Record<string, unknown> | null;
  kundliDocuments: KundliDocumentView[];
  privacy: (Record<PrivacyToggleKey, boolean> & {
    Id?: string;
    UserId?: string;
  }) | null;
  religions: LookupItem[];
  languages: LookupItem[];
  completion: ReturnType<typeof calculateProfileCompletion>;
};
