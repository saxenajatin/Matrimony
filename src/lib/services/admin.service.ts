import "server-only";

import type {
  VerificationStatus,
  VerificationType,
} from "@/lib/constants/admin";
import { createPhotoSignedUrl } from "@/lib/services/photo.service";
import { createNotification } from "@/lib/services/notification.service";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRow = {
  Id: string;
  Username: string;
  Email: string | null;
  DisplayName: string | null;
  IsActive: boolean;
  CreatedAt: string;
  ProfileId: string | null;
  ProfileDisplayName: string | null;
  ProfileStatus: string | null;
  IsVerified: boolean;
  ProfileCompletion: number;
};

export type AdminVerificationRow = {
  Id: string;
  ProfileId: string;
  UserId: string;
  VerificationType: VerificationType;
  Status: VerificationStatus;
  DocumentType: string | null;
  DocumentReference: string | null;
  VerifiedByUserId: string | null;
  VerifiedAt: string | null;
  RejectionReason: string | null;
  Notes: string | null;
  CreatedAt: string;
  DisplayName?: string | null;
  Username?: string | null;
};

export type AdminPhotoRow = {
  Id: string;
  UserId: string;
  StoragePath: string;
  FileName: string;
  FileType: string;
  IsPrimary: boolean;
  ModerationStatus: string;
  CreatedAt: string;
  SignedUrl?: string | null;
  DisplayName?: string | null;
  Username?: string | null;
};

export type AdminAnalytics = {
  totalUsers: number;
  activeUsers: number;
  newUsers7d: number;
  verifiedProfiles: number;
  activeProfiles: number;
  pendingVerifications: number;
  pendingPhotos: number;
  openReports: number;
  pendingInterests: number;
  acceptedInterests: number;
  conversations: number;
  messages7d: number;
};

function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export async function getAdminOverviewMetrics(): Promise<AdminAnalytics> {
  const admin = createAdminClient();
  const since7d = daysAgoIso(7);

  async function count(
    run: () => PromiseLike<{ count: number | null; error: unknown }>,
  ) {
    try {
      const result = await run();
      if (result.error) return 0;
      return result.count ?? 0;
    } catch {
      return 0;
    }
  }

  const [
    totalUsers,
    activeUsers,
    newUsers7d,
    verifiedProfiles,
    activeProfiles,
    pendingVerifications,
    pendingPhotos,
    openReports,
    pendingInterests,
    acceptedInterests,
    conversations,
    messages7d,
  ] = await Promise.all([
    count(() =>
      admin.from("AMVS_Users").select("Id", { count: "exact", head: true }),
    ),
    count(() =>
      admin
        .from("AMVS_Users")
        .select("Id", { count: "exact", head: true })
        .eq("IsActive", true),
    ),
    count(() =>
      admin
        .from("AMVS_Users")
        .select("Id", { count: "exact", head: true })
        .gte("CreatedAt", since7d),
    ),
    count(() =>
      admin
        .from("AMVS_Profiles")
        .select("Id", { count: "exact", head: true })
        .eq("IsVerified", true),
    ),
    count(() =>
      admin
        .from("AMVS_Profiles")
        .select("Id", { count: "exact", head: true })
        .eq("IsActive", true)
        .eq("ProfileStatus", "active"),
    ),
    count(() =>
      admin
        .from("AMVS_ProfileVerifications")
        .select("Id", { count: "exact", head: true })
        .eq("Status", "pending"),
    ),
    count(() =>
      admin
        .from("AMVS_ProfilePhotos")
        .select("Id", { count: "exact", head: true })
        .eq("ModerationStatus", "pending"),
    ),
    count(() =>
      admin
        .from("AMVS_Reports")
        .select("Id", { count: "exact", head: true })
        .in("Status", ["open", "reviewing"]),
    ),
    count(() =>
      admin
        .from("AMVS_Interests")
        .select("Id", { count: "exact", head: true })
        .eq("Status", "pending"),
    ),
    count(() =>
      admin
        .from("AMVS_Interests")
        .select("Id", { count: "exact", head: true })
        .eq("Status", "accepted"),
    ),
    count(() =>
      admin
        .from("AMVS_Conversations")
        .select("Id", { count: "exact", head: true }),
    ),
    count(() =>
      admin
        .from("AMVS_Messages")
        .select("Id", { count: "exact", head: true })
        .gte("CreatedAt", since7d),
    ),
  ]);

  return {
    totalUsers,
    activeUsers,
    newUsers7d,
    verifiedProfiles,
    activeProfiles,
    pendingVerifications,
    pendingPhotos,
    openReports,
    pendingInterests,
    acceptedInterests,
    conversations,
    messages7d,
  };
}

export async function listAdminUsers(options?: {
  q?: string;
  limit?: number;
}): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const q = options?.q?.trim();

  let query = admin
    .from("AMVS_Users")
    .select("Id, Username, Email, DisplayName, IsActive, CreatedAt")
    .order("CreatedAt", { ascending: false })
    .limit(limit);

  if (q) {
    query = query.or(
      `Username.ilike.%${q}%,Email.ilike.%${q}%,DisplayName.ilike.%${q}%`,
    );
  }

  const { data: users, error } = await query;
  if (error) throw error;
  if (!users?.length) return [];

  const userIds = users.map((row) => row.Id as string);
  const { data: profiles, error: profileError } = await admin
    .from("AMVS_Profiles")
    .select(
      "Id, UserId, DisplayName, ProfileStatus, IsVerified, ProfileCompletion",
    )
    .in("UserId", userIds);
  if (profileError) throw profileError;

  const profileByUser = new Map(
    (profiles ?? []).map((row) => [row.UserId as string, row]),
  );

  return users.map((user) => {
    const profile = profileByUser.get(user.Id as string);
    return {
      Id: user.Id as string,
      Username: user.Username as string,
      Email: (user.Email as string | null) ?? null,
      DisplayName: (user.DisplayName as string | null) ?? null,
      IsActive: Boolean(user.IsActive),
      CreatedAt: user.CreatedAt as string,
      ProfileId: (profile?.Id as string | undefined) ?? null,
      ProfileDisplayName: (profile?.DisplayName as string | undefined) ?? null,
      ProfileStatus: (profile?.ProfileStatus as string | undefined) ?? null,
      IsVerified: Boolean(profile?.IsVerified),
      ProfileCompletion: Number(profile?.ProfileCompletion ?? 0),
    };
  });
}

export async function setUserActive(userId: string, isActive: boolean) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("AMVS_Users")
    .update({ IsActive: isActive })
    .eq("Id", userId);
  if (error) throw error;

  // Keep profile visibility aligned when suspending
  await admin
    .from("AMVS_Profiles")
    .update({
      IsActive: isActive,
      ProfileStatus: isActive ? "active" : "suspended",
    })
    .eq("UserId", userId);
}

export async function setProfileVerified(
  profileId: string,
  isVerified: boolean,
  adminUserId: string,
) {
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("AMVS_Profiles")
    .select("Id, UserId, DisplayName")
    .eq("Id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error("Profile not found.");

  const { error: updateError } = await admin
    .from("AMVS_Profiles")
    .update({ IsVerified: isVerified })
    .eq("Id", profileId);
  if (updateError) throw updateError;

  if (isVerified) {
    await admin.from("AMVS_ProfileVerifications").insert({
      ProfileId: profileId,
      UserId: profile.UserId,
      VerificationType: "profile",
      Status: "verified",
      VerifiedByUserId: adminUserId,
      VerifiedAt: new Date().toISOString(),
      Notes: "Marked verified by admin",
    });

    await createNotification({
      userId: profile.UserId as string,
      type: "profile_verification",
      title: "Profile verified",
      message: "Your matrimonial profile has been verified.",
      data: { profileId },
    }).catch(() => null);
  }
}

export async function createVerificationRequest(input: {
  profileId: string;
  userId: string;
  verificationType: VerificationType;
  documentType?: string;
  documentReference?: string;
  notes?: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_ProfileVerifications")
    .insert({
      ProfileId: input.profileId,
      UserId: input.userId,
      VerificationType: input.verificationType,
      Status: "pending",
      DocumentType: input.documentType ?? null,
      DocumentReference: input.documentReference ?? null,
      Notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminVerificationRow;
}

export async function listVerifications(options?: {
  status?: VerificationStatus;
}): Promise<AdminVerificationRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("AMVS_ProfileVerifications")
    .select("*")
    .order("CreatedAt", { ascending: false })
    .limit(100);

  if (options?.status) {
    query = query.eq("Status", options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as AdminVerificationRow[];
  if (!rows.length) return [];

  const userIds = rows.map((row) => row.UserId);
  const [users, profiles] = await Promise.all([
    admin.from("AMVS_Users").select("Id, Username").in("Id", userIds),
    admin
      .from("AMVS_Profiles")
      .select("UserId, DisplayName")
      .in("UserId", userIds),
  ]);

  const userMap = new Map(
    (users.data ?? []).map((row) => [row.Id as string, row.Username as string]),
  );
  const profileMap = new Map(
    (profiles.data ?? []).map((row) => [
      row.UserId as string,
      row.DisplayName as string,
    ]),
  );

  return rows.map((row) => ({
    ...row,
    Username: userMap.get(row.UserId) ?? null,
    DisplayName: profileMap.get(row.UserId) ?? null,
  }));
}

export async function reviewVerification(input: {
  verificationId: string;
  adminUserId: string;
  status: "verified" | "rejected" | "expired";
  rejectionReason?: string;
}) {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("AMVS_ProfileVerifications")
    .select("*")
    .eq("Id", input.verificationId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Verification not found.");

  const { error: updateError } = await admin
    .from("AMVS_ProfileVerifications")
    .update({
      Status: input.status,
      VerifiedByUserId: input.adminUserId,
      VerifiedAt: new Date().toISOString(),
      RejectionReason: input.rejectionReason ?? null,
    })
    .eq("Id", input.verificationId);
  if (updateError) throw updateError;

  if (input.status === "verified" && row.VerificationType === "profile") {
    await admin
      .from("AMVS_Profiles")
      .update({ IsVerified: true })
      .eq("Id", row.ProfileId);
  }

  if (input.status === "verified") {
    await createNotification({
      userId: row.UserId as string,
      type: "profile_verification",
      title: "Verification approved",
      message: `Your ${row.VerificationType} verification was approved.`,
      data: { verificationId: row.Id },
    }).catch(() => null);
  } else if (input.status === "rejected") {
    await createNotification({
      userId: row.UserId as string,
      type: "profile_verification",
      title: "Verification rejected",
      message:
        input.rejectionReason ||
        `Your ${row.VerificationType} verification was rejected.`,
      data: { verificationId: row.Id },
    }).catch(() => null);
  }
}

export async function listProfilesNeedingVerification(): Promise<
  {
    ProfileId: string;
    UserId: string;
    DisplayName: string;
    Username: string | null;
    ProfileCompletion: number;
    IsVerified: boolean;
  }[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Profiles")
    .select("Id, UserId, DisplayName, ProfileCompletion, IsVerified")
    .eq("IsActive", true)
    .eq("IsVerified", false)
    .eq("ProfileStatus", "active")
    .gte("ProfileCompletion", 40)
    .order("ProfileCompletion", { ascending: false })
    .limit(50);
  if (error) throw error;

  const rows = data ?? [];
  const userIds = rows.map((row) => row.UserId as string);
  const { data: users } = await admin
    .from("AMVS_Users")
    .select("Id, Username")
    .in("Id", userIds);
  const userMap = new Map(
    (users ?? []).map((row) => [row.Id as string, row.Username as string]),
  );

  return rows.map((row) => ({
    ProfileId: row.Id as string,
    UserId: row.UserId as string,
    DisplayName: row.DisplayName as string,
    Username: userMap.get(row.UserId as string) ?? null,
    ProfileCompletion: Number(row.ProfileCompletion ?? 0),
    IsVerified: Boolean(row.IsVerified),
  }));
}

export async function listPendingPhotos(): Promise<AdminPhotoRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_ProfilePhotos")
    .select("*")
    .eq("ModerationStatus", "pending")
    .order("CreatedAt", { ascending: true })
    .limit(50);
  if (error) throw error;

  const rows = (data ?? []) as AdminPhotoRow[];
  if (!rows.length) return [];

  const userIds = rows.map((row) => row.UserId);
  const [users, profiles] = await Promise.all([
    admin.from("AMVS_Users").select("Id, Username").in("Id", userIds),
    admin
      .from("AMVS_Profiles")
      .select("UserId, DisplayName")
      .in("UserId", userIds),
  ]);
  const userMap = new Map(
    (users.data ?? []).map((row) => [row.Id as string, row.Username as string]),
  );
  const profileMap = new Map(
    (profiles.data ?? []).map((row) => [
      row.UserId as string,
      row.DisplayName as string,
    ]),
  );

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      Username: userMap.get(row.UserId) ?? null,
      DisplayName: profileMap.get(row.UserId) ?? null,
      SignedUrl: await createPhotoSignedUrl(row.StoragePath),
    })),
  );
}

export async function moderatePhoto(
  photoId: string,
  status: "approved" | "rejected",
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_ProfilePhotos")
    .update({ ModerationStatus: status })
    .eq("Id", photoId)
    .select("UserId")
    .single();
  if (error) throw error;

  await createNotification({
    userId: data.UserId as string,
    type: "system",
    title: status === "approved" ? "Photo approved" : "Photo rejected",
    message:
      status === "approved"
        ? "Your profile photo was approved and is now visible when privacy allows."
        : "A profile photo was rejected by moderation.",
    data: { photoId, status },
  }).catch(() => null);
}
