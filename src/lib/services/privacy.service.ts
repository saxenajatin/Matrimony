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
  const { data, error } = await admin
    .from("AMVS_ProfilePrivacy")
    .select("*")
    .eq("UserId", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    await ensurePrivacyDefaults(userId);
    return { ...DEFAULT_PRIVACY, UserId: userId };
  }

  return {
    ...DEFAULT_PRIVACY,
    ...(data as ProfilePrivacy),
  };
}

/** Batch privacy reads — no per-row upsert (scale-safe for Discover/Matches). */
export async function getPrivacySettingsBatch(
  userIds: string[],
): Promise<Map<string, ProfilePrivacy>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, ProfilePrivacy>();
  if (unique.length === 0) return map;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_ProfilePrivacy")
    .select("*")
    .in("UserId", unique);
  if (error) throw error;

  const found = new Set<string>();
  for (const row of data ?? []) {
    const userId = row.UserId as string;
    found.add(userId);
    map.set(userId, {
      ...DEFAULT_PRIVACY,
      ...(row as ProfilePrivacy),
    });
  }

  for (const userId of unique) {
    if (!found.has(userId)) {
      map.set(userId, { ...DEFAULT_PRIVACY, UserId: userId });
    }
  }

  return map;
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
