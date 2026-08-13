import "server-only";

import { DEFAULT_PRIVACY } from "@/lib/constants/privacy";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPrimaryPhotoUrl,
  getPrimaryPhotoUrlsBatch,
  listUserPhotos,
} from "@/lib/services/photo.service";
import {
  applyPrivacyToPublicProfile,
  getPrivacySettings,
  getPrivacySettingsBatch,
  type ProfilePrivacy,
} from "@/lib/services/privacy.service";
import type { DiscoverProfile } from "@/lib/types/discover";
import {
  DISCOVER_PAGE_SIZE,
  type DiscoverFilters,
} from "@/lib/validations/discover";

export type DiscoverSearchResult = {
  profiles: DiscoverProfile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function toRpcFilters(filters: DiscoverFilters, excludeUserId?: string) {
  return {
    p_exclude_user_id: excludeUserId ?? null,
    p_q: filters.q ?? null,
    p_gender: filters.gender ?? null,
    p_marital_status: filters.maritalStatus ?? null,
    p_age_min: filters.ageMin ?? null,
    p_age_max: filters.ageMax ?? null,
    p_city: filters.city ?? null,
    p_state: filters.state ?? null,
    p_country: filters.country ?? null,
    p_religion: filters.religion ?? null,
    p_mother_tongue: filters.motherTongue ?? null,
    p_education: filters.education ?? null,
    p_verified_only: filters.verifiedOnly ?? false,
    p_height_min: filters.heightMin ?? null,
    p_height_max: filters.heightMax ?? null,
  };
}

function enrichWithPrivacy(
  row: DiscoverProfile,
  privacy: ProfilePrivacy,
  primaryPhotoUrl: string | null,
): DiscoverProfile | null {
  if (!privacy.ProfileVisible || !privacy.AllowProfileViews) {
    return null;
  }

  return applyPrivacyToPublicProfile(
    {
      ...row,
      PrimaryPhotoUrl: privacy.ShowPhotos ? primaryPhotoUrl : null,
    },
    privacy,
  ) as DiscoverProfile;
}

async function enrichDiscoverRows(
  rows: DiscoverProfile[],
): Promise<DiscoverProfile[]> {
  const userIds = rows
    .map((row) => row.UserId)
    .filter((id): id is string => Boolean(id));

  const [privacyMap, photoMap] = await Promise.all([
    getPrivacySettingsBatch(userIds),
    getPrimaryPhotoUrlsBatch(userIds),
  ]);

  const enriched: DiscoverProfile[] = [];
  for (const row of rows) {
    if (!row.UserId) {
      enriched.push({ ...row, PrimaryPhotoUrl: null });
      continue;
    }
    const privacy =
      privacyMap.get(row.UserId) ??
      ({ ...DEFAULT_PRIVACY, UserId: row.UserId } as ProfilePrivacy);
    const next = enrichWithPrivacy(
      row,
      privacy,
      photoMap.get(row.UserId) ?? null,
    );
    if (next) enriched.push(next);
  }
  return enriched;
}

async function enrichDiscoverRow(
  row: DiscoverProfile,
): Promise<DiscoverProfile | null> {
  const [enriched] = await enrichDiscoverRows([row]);
  return enriched ?? null;
}

export async function searchDiscoverProfiles(options: {
  filters: DiscoverFilters;
  excludeUserId?: string;
  pageSize?: number;
}): Promise<DiscoverSearchResult> {
  const admin = createAdminClient();
  const pageSize = Math.min(
    Math.max(options.pageSize ?? DISCOVER_PAGE_SIZE, 1),
    50,
  );
  const page = Math.max(options.filters.page, 1);
  const offset = (page - 1) * pageSize;
  const rpcFilters = toRpcFilters(options.filters, options.excludeUserId);

  // Skip exact COUNT on deep pages (>5) — use hasMore heuristic for scale.
  const needExactCount = page <= 5;
  const [listResult, countResult] = await Promise.all([
    admin.rpc("AMVS_SearchDiscoverProfiles", {
      ...rpcFilters,
      p_limit: pageSize,
      p_offset: offset,
    }),
    needExactCount
      ? admin.rpc("AMVS_CountDiscoverProfiles", rpcFilters)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (listResult.error) throw listResult.error;
  if (countResult.error) throw countResult.error;

  const rows = (listResult.data ?? []) as DiscoverProfile[];
  const enriched = await enrichDiscoverRows(rows);

  let total: number;
  if (needExactCount) {
    total = Number(countResult.data ?? 0);
  } else {
    // Approximate: at least current page window; +1 page if full page returned.
    total =
      rows.length < pageSize
        ? offset + enriched.length
        : offset + pageSize + 1;
  }

  return {
    profiles: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

/** @deprecated Prefer searchDiscoverProfiles for Phase 4 filters/pagination. */
export async function listDiscoverProfiles(options?: {
  limit?: number;
  offset?: number;
  excludeUserId?: string;
}): Promise<DiscoverProfile[]> {
  const pageSize = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const page = Math.floor(offset / pageSize) + 1;

  const result = await searchDiscoverProfiles({
    filters: { page },
    excludeUserId: options?.excludeUserId,
    pageSize,
  });

  return result.profiles;
}

export async function getDiscoverProfileById(options: {
  profileId: string;
  viewerUserId?: string;
}): Promise<DiscoverProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("AMVS_GetDiscoverProfile", {
    p_profile_id: options.profileId,
    p_viewer_user_id: options.viewerUserId ?? null,
  });

  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as
    | DiscoverProfile
    | undefined;
  if (!row) return null;

  // Owner can always view their own profile even if hidden from Discover.
  if (options.viewerUserId && row.UserId === options.viewerUserId) {
    const primaryPhotoUrl = await getPrimaryPhotoUrl(row.UserId).catch(
      () => null,
    );
    return { ...row, PrimaryPhotoUrl: primaryPhotoUrl };
  }

  return enrichDiscoverRow(row);
}

export async function getDiscoverProfileGallery(userId: string) {
  const privacy = await getPrivacySettings(userId);
  if (!privacy.ShowPhotos) return [];
  return listUserPhotos(userId, { withSignedUrls: true, approvedOnly: true });
}
