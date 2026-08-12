import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { listUserPhotos } from "@/lib/services/photo.service";
import {
  getHoroscope,
  listKundliDocuments,
} from "@/lib/services/horoscope.service";
import { getPrivacySettings } from "@/lib/services/privacy.service";
import {
  calculateProfileCompletion,
  hasAnyValue,
} from "@/lib/services/profile-completion";
import type { DiscoverProfile } from "@/lib/types/discover";
import type { LookupItem, ProfileBundle } from "@/lib/types/profile";
import type {
  BasicProfileInput,
  CareerInput,
  EducationInput,
  FamilyInput,
  LifestyleInput,
  LocationPhysicalInput,
  PreferencesInput,
  ReligionInput,
} from "@/lib/validations/profile";

export type { DiscoverProfile, LookupItem, ProfileBundle };

export async function syncProfileCompletionByUserId(userId: string) {
  return syncProfileCompletion(userId);
}

export {
  formatHeight,
  formatMaritalStatus,
} from "@/lib/utils/profile-display";

export {
  getDiscoverProfileById,
  listDiscoverProfiles,
  searchDiscoverProfiles,
} from "@/lib/services/discover.service";

export async function getLookups() {
  const admin = createAdminClient();
  const [religions, languages] = await Promise.all([
    admin
      .from("AMVS_Religions")
      .select("Id, Code, Name")
      .eq("IsActive", true)
      .order("SortOrder"),
    admin
      .from("AMVS_Languages")
      .select("Id, Code, Name")
      .eq("IsActive", true)
      .order("SortOrder"),
  ]);

  return {
    religions: (religions.data ?? []) as LookupItem[],
    languages: (languages.data ?? []) as LookupItem[],
  };
}

export async function getMyProfileBundle(userId: string): Promise<ProfileBundle> {
  const admin = createAdminClient();

  const [
    profileRes,
    contactRes,
    physicalRes,
    educationRes,
    careerRes,
    religionRes,
    familyRes,
    lifestyleRes,
    preferencesRes,
    photos,
    horoscope,
    kundliDocuments,
    privacy,
    lookups,
  ] = await Promise.all([
    admin.from("AMVS_Profiles").select("*").eq("UserId", userId).maybeSingle(),
    admin
      .from("AMVS_ContactInformation")
      .select("*")
      .eq("UserId", userId)
      .maybeSingle(),
    admin
      .from("AMVS_PhysicalInformation")
      .select("*")
      .eq("UserId", userId)
      .maybeSingle(),
    admin.from("AMVS_Education").select("*").eq("UserId", userId).maybeSingle(),
    admin.from("AMVS_Career").select("*").eq("UserId", userId).maybeSingle(),
    admin
      .from("AMVS_ReligionInformation")
      .select("*")
      .eq("UserId", userId)
      .maybeSingle(),
    admin
      .from("AMVS_FamilyInformation")
      .select("*")
      .eq("UserId", userId)
      .maybeSingle(),
    admin
      .from("AMVS_LifestyleInformation")
      .select("*")
      .eq("UserId", userId)
      .maybeSingle(),
    admin
      .from("AMVS_PartnerPreferences")
      .select("*")
      .eq("UserId", userId)
      .maybeSingle(),
    listUserPhotos(userId, { withSignedUrls: true }).catch(() => []),
    getHoroscope(userId).catch(() => null),
    listKundliDocuments(userId, { withSignedUrls: true }).catch(() => []),
    getPrivacySettings(userId).catch(() => null),
    getLookups(),
  ]);

  const profile = profileRes.data as Record<string, unknown> | null;
  let siblings: Record<string, unknown>[] = [];
  let familyMembers: Record<string, unknown>[] = [];

  if (profile?.Id) {
    const [siblingsRes, membersRes] = await Promise.all([
      admin.from("AMVS_Siblings").select("*").eq("ProfileId", profile.Id),
      admin.from("AMVS_FamilyMembers").select("*").eq("ProfileId", profile.Id),
    ]);
    siblings = (siblingsRes.data ?? []) as Record<string, unknown>[];
    familyMembers = (membersRes.data ?? []) as Record<string, unknown>[];
  }

  const completion = calculateProfileCompletion({
    hasBasic: Boolean(
      profile?.FirstName &&
        profile?.LastName &&
        profile?.Gender &&
        profile?.DateOfBirth,
    ),
    hasAboutMe: Boolean(
      profile?.AboutMe && String(profile.AboutMe).trim().length > 0,
    ),
    hasEducationOrCareer:
      hasAnyValue(educationRes.data as Record<string, unknown> | null) ||
      hasAnyValue(careerRes.data as Record<string, unknown> | null),
    hasFamily: hasAnyValue(familyRes.data as Record<string, unknown> | null),
    hasLifestyle: hasAnyValue(
      lifestyleRes.data as Record<string, unknown> | null,
    ),
    hasPreferences: hasAnyValue(
      preferencesRes.data as Record<string, unknown> | null,
    ),
    hasPhoto: photos.length > 0,
  });

  return {
    profile,
    contact: contactRes.data as Record<string, unknown> | null,
    physical: physicalRes.data as Record<string, unknown> | null,
    education: educationRes.data as Record<string, unknown> | null,
    career: careerRes.data as Record<string, unknown> | null,
    religion: religionRes.data as Record<string, unknown> | null,
    family: familyRes.data as Record<string, unknown> | null,
    lifestyle: lifestyleRes.data as Record<string, unknown> | null,
    preferences: preferencesRes.data as Record<string, unknown> | null,
    siblings,
    familyMembers,
    photos,
    horoscope: (horoscope as Record<string, unknown> | null) ?? null,
    kundliDocuments: kundliDocuments as ProfileBundle["kundliDocuments"],
    privacy,
    religions: lookups.religions,
    languages: lookups.languages,
    completion,
  };
}

async function syncProfileCompletion(userId: string) {
  const bundle = await getMyProfileBundle(userId);
  const admin = createAdminClient();
  await admin
    .from("AMVS_Profiles")
    .update({
      ProfileCompletion: bundle.completion.total,
      UpdatedAt: new Date().toISOString(),
    })
    .eq("UserId", userId);
  return bundle.completion;
}

export async function upsertBasicProfile(
  userId: string,
  input: BasicProfileInput,
) {
  const admin = createAdminClient();
  const displayName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ");

  const { data: existing } = await admin
    .from("AMVS_Profiles")
    .select("Id")
    .eq("UserId", userId)
    .maybeSingle();

  const payload = {
    UserId: userId,
    CreatedByUserId: userId,
    ProfileFor: input.profileFor,
    FirstName: input.firstName,
    MiddleName: input.middleName,
    LastName: input.lastName,
    DisplayName: displayName,
    Gender: input.gender,
    DateOfBirth: input.dateOfBirth,
    MaritalStatus: input.maritalStatus,
    AboutMe: input.aboutMe,
    IsActive: true,
  };

  if (existing?.Id) {
    const { error } = await admin
      .from("AMVS_Profiles")
      .update(payload)
      .eq("UserId", userId);
    if (error) throw error;
  } else {
    const { error } = await admin.from("AMVS_Profiles").insert({
      ...payload,
      ProfileStatus: "draft",
      ProfileCompletion: 0,
    });
    if (error) throw error;
  }

  return syncProfileCompletion(userId);
}

export async function upsertLocationPhysical(
  userId: string,
  input: LocationPhysicalInput,
) {
  const admin = createAdminClient();

  const [{ error: contactError }, { error: physicalError }, profileUpdate] =
    await Promise.all([
      admin.from("AMVS_ContactInformation").upsert(
        {
          UserId: userId,
          Phone: input.phone,
          Email: input.email,
          Country: input.country ?? "India",
          State: input.state,
          City: input.city,
          Address: input.address,
          NativeCountry: input.nativeCountry,
          NativeState: input.nativeState,
          NativeCity: input.nativeCity,
        },
        { onConflict: "UserId" },
      ),
      admin.from("AMVS_PhysicalInformation").upsert(
        {
          UserId: userId,
          HeightCm: input.heightCm,
          WeightKg: input.weightKg,
          BodyType: input.bodyType,
          Complexion: input.complexion,
          BloodGroup: input.bloodGroup,
        },
        { onConflict: "UserId" },
      ),
      admin
        .from("AMVS_Profiles")
        .update({
          City: input.city,
          State: input.state,
          Country: input.country ?? "India",
          HeightCm: input.heightCm,
        })
        .eq("UserId", userId),
    ]);

  if (contactError) throw contactError;
  if (physicalError) throw physicalError;
  if (profileUpdate.error) throw profileUpdate.error;

  return syncProfileCompletion(userId);
}

export async function upsertEducation(userId: string, input: EducationInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("AMVS_Education").upsert(
    {
      UserId: userId,
      HighestEducation: input.highestEducation,
      Degree: input.degree,
      Specialization: input.specialization,
      Institution: input.institution,
      EducationCity: input.educationCity,
      EducationCountry: input.educationCountry,
      GraduationYear: input.graduationYear,
      AdditionalQualification: input.additionalQualification,
    },
    { onConflict: "UserId" },
  );
  if (error) throw error;

  await admin
    .from("AMVS_Profiles")
    .update({
      Education: input.highestEducation || input.degree,
    })
    .eq("UserId", userId);

  return syncProfileCompletion(userId);
}

export async function upsertCareer(userId: string, input: CareerInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("AMVS_Career").upsert(
    {
      UserId: userId,
      EmploymentType: input.employmentType,
      Occupation: input.occupation,
      JobTitle: input.jobTitle,
      Company: input.company,
      Industry: input.industry,
      WorkLocation: input.workLocation,
      Country: input.country,
      State: input.state,
      City: input.city,
      AnnualIncome: input.annualIncome,
      IncomeCurrency: input.incomeCurrency || "INR",
      ExperienceYears: input.experienceYears,
      BusinessName: input.businessName,
      BusinessType: input.businessType,
    },
    { onConflict: "UserId" },
  );
  if (error) throw error;

  await admin
    .from("AMVS_Profiles")
    .update({
      Occupation: input.occupation || input.jobTitle,
    })
    .eq("UserId", userId);

  return syncProfileCompletion(userId);
}

export async function upsertReligion(userId: string, input: ReligionInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("AMVS_ReligionInformation").upsert(
    {
      UserId: userId,
      ReligionId: input.religionId,
      CommunityId: input.communityId,
      Caste: input.caste,
      SubCaste: input.subCaste,
      MotherTongueId: input.motherTongueId,
    },
    { onConflict: "UserId" },
  );
  if (error) throw error;

  let religionName: string | null = null;
  let tongueName: string | null = null;
  if (input.religionId) {
    const { data } = await admin
      .from("AMVS_Religions")
      .select("Name")
      .eq("Id", input.religionId)
      .maybeSingle();
    religionName = data?.Name ?? null;
  }
  if (input.motherTongueId) {
    const { data } = await admin
      .from("AMVS_Languages")
      .select("Name")
      .eq("Id", input.motherTongueId)
      .maybeSingle();
    tongueName = data?.Name ?? null;
  }

  await admin
    .from("AMVS_Profiles")
    .update({
      Religion: religionName,
      MotherTongue: tongueName,
    })
    .eq("UserId", userId);

  return syncProfileCompletion(userId);
}

export async function upsertFamily(userId: string, input: FamilyInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("AMVS_FamilyInformation").upsert(
    {
      UserId: userId,
      FatherName: input.fatherName,
      FatherOccupation: input.fatherOccupation,
      MotherName: input.motherName,
      MotherOccupation: input.motherOccupation,
      FamilyType: input.familyType,
      FamilyValues: input.familyValues,
      FamilyStatus: input.familyStatus,
      NativePlace: input.nativePlace,
      FamilyCity: input.familyCity,
      FamilyState: input.familyState,
      AboutFamily: input.aboutFamily,
      HasChildren: input.hasChildren,
      ChildrenCount: input.childrenCount,
    },
    { onConflict: "UserId" },
  );
  if (error) throw error;
  return syncProfileCompletion(userId);
}

export async function upsertLifestyle(userId: string, input: LifestyleInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("AMVS_LifestyleInformation").upsert(
    {
      UserId: userId,
      Diet: input.diet,
      Smoking: input.smoking,
      Drinking: input.drinking,
      Exercise: input.exercise,
      Hobbies: input.hobbies,
      Interests: input.interests,
      Pets: input.pets,
      Personality: input.personality,
      WeekendActivities: input.weekendActivities,
    },
    { onConflict: "UserId" },
  );
  if (error) throw error;
  return syncProfileCompletion(userId);
}

export async function upsertPreferences(
  userId: string,
  input: PreferencesInput,
) {
  const admin = createAdminClient();
  const { error } = await admin.from("AMVS_PartnerPreferences").upsert(
    {
      UserId: userId,
      MinAge: input.minAge,
      MaxAge: input.maxAge,
      MinHeightCm: input.minHeightCm,
      MaxHeightCm: input.maxHeightCm,
      PreferredGender: input.preferredGender,
      EducationPreferences: input.educationPreferences,
      OccupationPreferences: input.occupationPreferences,
      DietPreferences: input.dietPreferences,
      SmokingPreferences: input.smokingPreferences,
      DrinkingPreferences: input.drinkingPreferences,
      FamilyTypes: input.familyTypes,
      FamilyValues: input.familyValues,
      Countries: input.countries,
      States: input.states,
      Cities: input.cities,
      Religions: input.religions,
      MotherTongues: input.motherTongues,
      Communities: input.communities,
      ManglikPreferences: input.manglikPreferences,
      RashiPreferences: input.rashiPreferences,
      NakshatraPreferences: input.nakshatraPreferences,
      GotraPreferences: input.gotraPreferences,
      WillingToRelocate: input.willingToRelocate,
      Notes: input.notes,
    },
    { onConflict: "UserId" },
  );
  if (error) throw error;
  return syncProfileCompletion(userId);
}

export async function activateProfile(userId: string) {
  const completion = await syncProfileCompletion(userId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("AMVS_Profiles")
    .update({
      ProfileStatus: "active",
      IsActive: true,
    })
    .eq("UserId", userId);
  if (error) throw error;
  return completion;
}

export async function addFamilyMember(
  userId: string,
  input: {
    relationshipType: string;
    name: string | null;
    occupation: string | null;
    location: string | null;
    maritalStatus: string | null;
    notes: string | null;
  },
) {
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("AMVS_Profiles")
    .select("Id")
    .eq("UserId", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.Id) {
    throw new Error("Create your basic profile before adding family members.");
  }

  const { error } = await admin.from("AMVS_FamilyMembers").insert({
    ProfileId: profile.Id,
    RelationshipType: input.relationshipType,
    Name: input.name,
    Occupation: input.occupation,
    Location: input.location,
    MaritalStatus: input.maritalStatus,
    Notes: input.notes,
  });
  if (error) throw error;
}

export async function deleteFamilyMember(userId: string, memberId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("AMVS_Profiles")
    .select("Id")
    .eq("UserId", userId)
    .maybeSingle();
  if (!profile?.Id) return;

  const { error } = await admin
    .from("AMVS_FamilyMembers")
    .delete()
    .eq("Id", memberId)
    .eq("ProfileId", profile.Id);
  if (error) throw error;
}
