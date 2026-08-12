import "server-only";

import {
  DEFAULT_PRIVACY,
  type PrivacyToggleKey,
} from "@/lib/constants/privacy";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfilePrivacy = Record<PrivacyToggleKey, boolean> & {
  Id?: string;
  UserId?: string;
};

export async function ensurePrivacyDefaults(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("AMVS_ProfilePrivacy").upsert(
    {
      UserId: userId,
      ...DEFAULT_PRIVACY,
    },
    { onConflict: "UserId", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function getPrivacySettings(
  userId: string,
): Promise<ProfilePrivacy> {
  const admin = createAdminClient();
  await ensurePrivacyDefaults(userId);

  const { data, error } = await admin
    .from("AMVS_ProfilePrivacy")
    .select("*")
    .eq("UserId", userId)
    .maybeSingle();

  if (error) throw error;

  return {
    ...DEFAULT_PRIVACY,
    ...(data as ProfilePrivacy | null),
  };
}

export async function updatePrivacySettings(
  userId: string,
  updates: Partial<Record<PrivacyToggleKey, boolean>>,
) {
  const admin = createAdminClient();
  await ensurePrivacyDefaults(userId);

  const payload: Record<string, boolean | string> = {
    UserId: userId,
  };

  for (const key of Object.keys(DEFAULT_PRIVACY) as PrivacyToggleKey[]) {
    if (typeof updates[key] === "boolean") {
      payload[key] = updates[key] as boolean;
    }
  }

  const { data, error } = await admin
    .from("AMVS_ProfilePrivacy")
    .upsert(payload, { onConflict: "UserId" })
    .select("*")
    .single();

  if (error) throw error;
  return data as ProfilePrivacy;
}

export function applyPrivacyToPublicProfile<
  T extends {
    Religion?: string | null;
    MotherTongue?: string | null;
    PrimaryPhotoUrl?: string | null;
    Photos?: unknown[];
  },
>(profile: T, privacy: ProfilePrivacy): T {
  const result = { ...profile };

  if (!privacy.ShowReligion) {
    result.Religion = null;
    result.MotherTongue = null;
  }

  if (!privacy.ShowPhotos) {
    result.PrimaryPhotoUrl = null;
    result.Photos = [];
  }

  return result;
}
