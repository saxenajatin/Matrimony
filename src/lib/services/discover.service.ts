import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPrimaryPhotoUrl,
  listUserPhotos,
} from "@/lib/services/photo.service";
import {
  applyPrivacyToPublicProfile,
  getPrivacySettings,
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

async function enrichDiscoverRow(
  row: DiscoverProfile,
): Promise<DiscoverProfile | null> {
  const userId = row.UserId;
  if (!userId) {
    return { ...row, PrimaryPhotoUrl: null };
  }

  let privacy;
  try {
    privacy = await getPrivacySettings(userId);
  } catch {
    return { ...row, PrimaryPhotoUrl: null };
  }

  if (!privacy.ProfileVisible || !privacy.AllowProfileViews) {
    return null;
  }

  const primaryPhotoUrl = privacy.ShowPhotos
    ? await getPrimaryPhotoUrl(userId)
    : null;

  return applyPrivacyToPublicProfile(
    {
      ...row,
      PrimaryPhotoUrl: primaryPhotoUrl,
    },
    privacy,
  ) as DiscoverProfile;
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

  const [listResult, countResult] = await Promise.all([
    admin.rpc("AMVS_SearchDiscoverProfiles", {
      ...rpcFilters,
      p_limit: pageSize,
      p_offset: offset,
    }),
    admin.rpc("AMVS_CountDiscoverProfiles", rpcFilters),
  ]);

  if (listResult.error) throw listResult.error;
  if (countResult.error) throw countResult.error;

  const rows = (listResult.data ?? []) as DiscoverProfile[];
  const total = Number(countResult.data ?? 0);
  const enriched = await Promise.all(rows.map((row) => enrichDiscoverRow(row)));

  return {
    profiles: enriched.filter(Boolean) as DiscoverProfile[],
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
