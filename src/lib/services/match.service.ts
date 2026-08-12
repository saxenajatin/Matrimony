import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPrimaryPhotoUrl,
} from "@/lib/services/photo.service";
import {
  applyPrivacyToPublicProfile,
  getPrivacySettings,
} from "@/lib/services/privacy.service";
import {
  calculateMatchScore,
  type MatchCandidateFacts,
  type MatchScoreResult,
  type PartnerPreferencesRow,
} from "@/lib/services/match-score";
import { searchDiscoverProfiles } from "@/lib/services/discover.service";
import type { DiscoverProfile } from "@/lib/types/discover";

export type RecommendedMatch = {
  profile: DiscoverProfile;
  score: MatchScoreResult;
};

async function getPartnerPreferences(
  userId: string,
): Promise<PartnerPreferencesRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_PartnerPreferences")
    .select("*")
    .eq("UserId", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as PartnerPreferencesRow | null) ?? null;
}

async function loadCandidateFacts(
  userIds: string[],
): Promise<Map<string, MatchCandidateFacts>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, MatchCandidateFacts>();
  if (unique.length === 0) return map;

  const admin = createAdminClient();
  const [profiles, lifestyles, families, religions, communities, horoscopes] =
    await Promise.all([
      admin
        .from("AMVS_Profiles")
        .select(
          "UserId, Gender, DateOfBirth, HeightCm, MaritalStatus, City, State, Country, Religion, MotherTongue, Education, Occupation",
        )
        .in("UserId", unique),
      admin
        .from("AMVS_LifestyleInformation")
        .select("UserId, Diet, Smoking, Drinking")
        .in("UserId", unique),
      admin
        .from("AMVS_FamilyInformation")
        .select("UserId, FamilyType, FamilyValues")
        .in("UserId", unique),
      admin
        .from("AMVS_ReligionInformation")
        .select("UserId, CommunityId")
        .in("UserId", unique),
      admin.from("AMVS_Communities").select("Id, Name"),
      admin
        .from("AMVS_Horoscope")
        .select("UserId, ManglikStatus, Rashi, Nakshatra, Gotra")
        .in("UserId", unique),
    ]);

  if (profiles.error) throw profiles.error;

  const lifestyleByUser = new Map(
    (lifestyles.data ?? []).map((row) => [row.UserId as string, row]),
  );
  const familyByUser = new Map(
    (families.data ?? []).map((row) => [row.UserId as string, row]),
  );
  const religionByUser = new Map(
    (religions.data ?? []).map((row) => [row.UserId as string, row]),
  );
  const communityNameById = new Map(
    (communities.data ?? []).map((row) => [
      row.Id as string,
      row.Name as string,
    ]),
  );
  const horoscopeByUser = new Map(
    (horoscopes.data ?? []).map((row) => [row.UserId as string, row]),
  );

  for (const row of profiles.data ?? []) {
    const userId = row.UserId as string;
    const dob = row.DateOfBirth as string | null;
    const age = dob
      ? Math.floor(
          (Date.now() - new Date(dob).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : null;
    const lifestyle = lifestyleByUser.get(userId);
    const family = familyByUser.get(userId);
    const horoscope = horoscopeByUser.get(userId);
    const communityId = religionByUser.get(userId)?.CommunityId as
      | string
      | null
      | undefined;
    map.set(userId, {
      UserId: userId,
      Gender: (row.Gender as string | null) ?? null,
      Age: age,
      HeightCm: (row.HeightCm as number | null) ?? null,
      MaritalStatus: (row.MaritalStatus as string | null) ?? null,
      City: (row.City as string | null) ?? null,
      State: (row.State as string | null) ?? null,
      Country: (row.Country as string | null) ?? null,
      Religion: (row.Religion as string | null) ?? null,
      MotherTongue: (row.MotherTongue as string | null) ?? null,
      Community: communityId
        ? (communityNameById.get(communityId) ?? null)
        : null,
      Education: (row.Education as string | null) ?? null,
      Occupation: (row.Occupation as string | null) ?? null,
      Diet: (lifestyle?.Diet as string | null) ?? null,
      Smoking: (lifestyle?.Smoking as string | null) ?? null,
      Drinking: (lifestyle?.Drinking as string | null) ?? null,
      FamilyType: (family?.FamilyType as string | null) ?? null,
      FamilyValues: (family?.FamilyValues as string | null) ?? null,
      ManglikStatus: (horoscope?.ManglikStatus as string | null) ?? null,
      Rashi: (horoscope?.Rashi as string | null) ?? null,
      Nakshatra: (horoscope?.Nakshatra as string | null) ?? null,
      Gotra: (horoscope?.Gotra as string | null) ?? null,
      HoroscopeAvailable: Boolean(horoscope),
    });
  }

  return map;
}

export async function getMatchScoreForProfile(options: {
  viewerUserId: string;
  candidateUserId: string;
}): Promise<MatchScoreResult | null> {
  if (options.viewerUserId === options.candidateUserId) return null;

  const [preferences, factsMap] = await Promise.all([
    getPartnerPreferences(options.viewerUserId),
    loadCandidateFacts([options.candidateUserId]),
  ]);

  const facts = factsMap.get(options.candidateUserId);
  if (!facts) return null;

  // Respect religion / horoscope privacy for scoring inputs
  try {
    const privacy = await getPrivacySettings(options.candidateUserId);
    if (!privacy.ShowReligion) {
      facts.Religion = null;
      facts.MotherTongue = null;
      facts.Community = null;
    }
    if (!privacy.ShowHoroscope) {
      facts.ManglikStatus = null;
      facts.Rashi = null;
      facts.Nakshatra = null;
      facts.Gotra = null;
      facts.HoroscopeAvailable = false;
    }
  } catch {
    // keep facts
  }

  return calculateMatchScore(preferences, facts);
}

export async function getRecommendedMatches(options: {
  viewerUserId: string;
  limit?: number;
}): Promise<{
  matches: RecommendedMatch[];
  preferences: PartnerPreferencesRow | null;
  hasPreferences: boolean;
}> {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 24);
  const preferences = await getPartnerPreferences(options.viewerUserId);

  const discover = await searchDiscoverProfiles({
    filters: {
      page: 1,
      gender: preferences?.PreferredGender || undefined,
      ageMin: preferences?.MinAge ?? undefined,
      ageMax: preferences?.MaxAge ?? undefined,
      city: preferences?.Cities?.split(/[,;/|]/)[0]?.trim() || undefined,
      state: preferences?.States?.split(/[,;/|]/)[0]?.trim() || undefined,
      country: preferences?.Countries?.split(/[,;/|]/)[0]?.trim() || undefined,
      religion: preferences?.Religions?.split(/[,;/|]/)[0]?.trim() || undefined,
      motherTongue:
        preferences?.MotherTongues?.split(/[,;/|]/)[0]?.trim() || undefined,
      education:
        preferences?.EducationPreferences?.split(/[,;/|]/)[0]?.trim() ||
        undefined,
      heightMin: preferences?.MinHeightCm ?? undefined,
      heightMax: preferences?.MaxHeightCm ?? undefined,
    },
    excludeUserId: options.viewerUserId,
    pageSize: 40,
  });

  // If hard filters return too few, broaden with unfiltered discover
  let profiles = discover.profiles;
  if (profiles.length < 6) {
    const broad = await searchDiscoverProfiles({
      filters: { page: 1 },
      excludeUserId: options.viewerUserId,
      pageSize: 40,
    });
    const seen = new Set(profiles.map((item) => item.Id));
    for (const profile of broad.profiles) {
      if (!seen.has(profile.Id)) profiles.push(profile);
    }
  }

  const userIds = profiles
    .map((profile) => profile.UserId)
    .filter((id): id is string => Boolean(id));
  const factsMap = await loadCandidateFacts(userIds);

  const scored: RecommendedMatch[] = [];
  for (const profile of profiles) {
    if (!profile.UserId) continue;
    const facts = factsMap.get(profile.UserId);
    if (!facts) continue;

    try {
      const privacy = await getPrivacySettings(profile.UserId);
      if (!privacy.ShowReligion) {
        facts.Religion = null;
        facts.MotherTongue = null;
        facts.Community = null;
      }
      if (!privacy.ShowHoroscope) {
        facts.ManglikStatus = null;
        facts.Rashi = null;
        facts.Nakshatra = null;
        facts.Gotra = null;
        facts.HoroscopeAvailable = false;
      }
      if (!privacy.ShowPhotos) {
        profile.PrimaryPhotoUrl = null;
      } else if (!profile.PrimaryPhotoUrl) {
        profile.PrimaryPhotoUrl = await getPrimaryPhotoUrl(profile.UserId);
      }
      Object.assign(
        profile,
        applyPrivacyToPublicProfile(profile, privacy),
      );
    } catch {
      // continue
    }

    const score = calculateMatchScore(preferences, facts);
    scored.push({ profile, score });
  }

  scored.sort((a, b) => {
    if (b.score.matchScore !== a.score.matchScore) {
      return b.score.matchScore - a.score.matchScore;
    }
    return Number(b.profile.IsVerified) - Number(a.profile.IsVerified);
  });

  const hasPreferences = Boolean(
    preferences &&
      Object.entries(preferences).some(([key, value]) => {
        if (["Id", "UserId", "CreatedAt", "UpdatedAt"].includes(key)) {
          return false;
        }
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "string") return value.trim().length > 0;
        return value != null;
      }),
  );

  return {
    matches: scored.slice(0, limit),
    preferences,
    hasPreferences,
  };
}
