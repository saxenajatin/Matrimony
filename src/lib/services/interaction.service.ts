import "server-only";

import type {
  InterestStatus,
  ReportReasonCode,
  ReportStatus,
} from "@/lib/constants/interactions";
import { getPrivacySettings } from "@/lib/services/privacy.service";
import { areUsersBlocked } from "@/lib/services/block.service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DiscoverProfile } from "@/lib/types/discover";

export { areUsersBlocked } from "@/lib/services/block.service";

export type InterestRow = {
  Id: string;
  FromUserId: string;
  ToUserId: string;
  Message: string | null;
  Status: InterestStatus;
  RespondedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
};

export type InterestListItem = InterestRow & {
  CounterpartyUserId: string;
  Profile: DiscoverProfile | null;
};

export type ShortlistItem = {
  Id: string;
  UserId: string;
  TargetUserId: string;
  Notes: string | null;
  CreatedAt: string;
  Profile: DiscoverProfile | null;
};

export type BlockItem = {
  Id: string;
  BlockerUserId: string;
  BlockedUserId: string;
  Reason: string | null;
  CreatedAt: string;
  Profile: DiscoverProfile | null;
};

export type ReportRow = {
  Id: string;
  ReporterUserId: string;
  ReportedUserId: string;
  ReasonCode: ReportReasonCode;
  Details: string | null;
  Status: ReportStatus;
  ResolvedAt: string | null;
  ResolvedByUserId: string | null;
  ResolutionNotes: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  ReporterName?: string | null;
  ReportedName?: string | null;
};

export type InteractionState = {
  targetUserId: string;
  isSelf: boolean;
  shortlisted: boolean;
  blockedByMe: boolean;
  blockedMe: boolean;
  outgoingInterest: InterestRow | null;
  incomingInterest: InterestRow | null;
  canSendInterest: boolean;
  canAcceptInterest: boolean;
  canMessage: boolean;
};

async function loadProfilesByUserIds(
  userIds: string[],
): Promise<Map<string, DiscoverProfile>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Profiles")
    .select(
      "Id, UserId, DisplayName, Gender, DateOfBirth, MaritalStatus, City, State, Country, Religion, MotherTongue, Education, Occupation, HeightCm, AboutMe, IsVerified, ProfileCompletion",
    )
    .in("UserId", unique);

  if (error) throw error;

  const map = new Map<string, DiscoverProfile>();
  for (const row of data ?? []) {
    const dob = row.DateOfBirth as string;
    const age = dob
      ? Math.floor(
          (Date.now() - new Date(dob).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : 0;
    map.set(row.UserId as string, {
      Id: row.Id as string,
      UserId: row.UserId as string,
      DisplayName: row.DisplayName as string,
      Gender: row.Gender as string,
      DateOfBirth: dob,
      Age: age,
      MaritalStatus: row.MaritalStatus as string,
      City: (row.City as string | null) ?? null,
      State: (row.State as string | null) ?? null,
      Country: (row.Country as string | null) ?? null,
      Religion: (row.Religion as string | null) ?? null,
      MotherTongue: (row.MotherTongue as string | null) ?? null,
      Education: (row.Education as string | null) ?? null,
      Occupation: (row.Occupation as string | null) ?? null,
      HeightCm: (row.HeightCm as number | null) ?? null,
      AboutMe: (row.AboutMe as string | null) ?? null,
      IsVerified: Boolean(row.IsVerified),
      ProfileCompletion: Number(row.ProfileCompletion ?? 0),
    });
  }
  return map;
}

export async function getInteractionState(
  viewerUserId: string,
  targetUserId: string,
): Promise<InteractionState> {
  const isSelf = viewerUserId === targetUserId;
  if (isSelf) {
    return {
      targetUserId,
      isSelf: true,
      shortlisted: false,
      blockedByMe: false,
      blockedMe: false,
      outgoingInterest: null,
      incomingInterest: null,
      canSendInterest: false,
      canAcceptInterest: false,
      canMessage: false,
    };
  }

  const admin = createAdminClient();
  const [shortlistRes, blockedByMeRes, blockedMeRes, outInterestRes, inInterestRes, privacy] =
    await Promise.all([
      admin
        .from("AMVS_Shortlist")
        .select("Id")
        .eq("UserId", viewerUserId)
        .eq("TargetUserId", targetUserId)
        .maybeSingle(),
      admin
        .from("AMVS_Blocks")
        .select("Id")
        .eq("BlockerUserId", viewerUserId)
        .eq("BlockedUserId", targetUserId)
        .maybeSingle(),
      admin
        .from("AMVS_Blocks")
        .select("Id")
        .eq("BlockerUserId", targetUserId)
        .eq("BlockedUserId", viewerUserId)
        .maybeSingle(),
      admin
        .from("AMVS_Interests")
        .select("*")
        .eq("FromUserId", viewerUserId)
        .eq("ToUserId", targetUserId)
        .maybeSingle(),
      admin
        .from("AMVS_Interests")
        .select("*")
        .eq("FromUserId", targetUserId)
        .eq("ToUserId", viewerUserId)
        .maybeSingle(),
      getPrivacySettings(targetUserId).catch(() => null),
    ]);

  if (shortlistRes.error) throw shortlistRes.error;
  if (blockedByMeRes.error) throw blockedByMeRes.error;
  if (blockedMeRes.error) throw blockedMeRes.error;
  if (outInterestRes.error) throw outInterestRes.error;
  if (inInterestRes.error) throw inInterestRes.error;

  const blockedByMe = Boolean(blockedByMeRes.data);
  const blockedMe = Boolean(blockedMeRes.data);
  const outgoingInterest = (outInterestRes.data as InterestRow | null) ?? null;
  const incomingInterest = (inInterestRes.data as InterestRow | null) ?? null;

  const allowInterests = privacy?.AllowInterests ?? true;
  const canResend =
    !outgoingInterest ||
    outgoingInterest.Status === "rejected" ||
    outgoingInterest.Status === "withdrawn";

  return {
    targetUserId,
    isSelf: false,
    shortlisted: Boolean(shortlistRes.data),
    blockedByMe,
    blockedMe,
    outgoingInterest,
    incomingInterest,
    canSendInterest:
      allowInterests &&
      !blockedByMe &&
      !blockedMe &&
      canResend &&
      !(incomingInterest?.Status === "pending"),
    canAcceptInterest: incomingInterest?.Status === "pending",
    canMessage:
      !blockedByMe &&
      !blockedMe &&
      (outgoingInterest?.Status === "accepted" ||
        incomingInterest?.Status === "accepted"),
  };
}

export async function sendInterest(
  fromUserId: string,
  toUserId: string,
  message?: string,
) {
  if (fromUserId === toUserId) {
    throw new Error("You cannot send interest to yourself.");
  }

  if (await areUsersBlocked(fromUserId, toUserId)) {
    throw new Error("You cannot send interest to this member.");
  }

  const privacy = await getPrivacySettings(toUserId);
  if (!privacy.AllowInterests) {
    throw new Error("This member is not accepting interests right now.");
  }

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("AMVS_Interests")
    .select("*")
    .eq("FromUserId", fromUserId)
    .eq("ToUserId", toUserId)
    .maybeSingle();

  if (existingError) throw existingError;

  const existingRow = existing as InterestRow | null;
  if (existingRow?.Status === "pending" || existingRow?.Status === "accepted") {
    throw new Error(
      existingRow.Status === "accepted"
        ? "You are already connected with this member."
        : "Interest is already pending.",
    );
  }

  const payload = {
    FromUserId: fromUserId,
    ToUserId: toUserId,
    Message: message?.trim() || null,
    Status: "pending",
    RespondedAt: null,
  };

  if (existingRow) {
    const { data, error } = await admin
      .from("AMVS_Interests")
      .update(payload)
      .eq("Id", existingRow.Id)
      .select("*")
      .single();
    if (error) throw error;
    return data as InterestRow;
  }

  const { data, error } = await admin
    .from("AMVS_Interests")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as InterestRow;
}

export async function respondToInterest(
  viewerUserId: string,
  interestId: string,
  status: "accepted" | "rejected" | "withdrawn",
) {
  const admin = createAdminClient();
  const { data: interest, error } = await admin
    .from("AMVS_Interests")
    .select("*")
    .eq("Id", interestId)
    .maybeSingle();

  if (error) throw error;
  if (!interest) throw new Error("Interest not found.");

  const row = interest as InterestRow;
  if (row.Status !== "pending") {
    throw new Error("Only pending interests can be updated.");
  }

  if (status === "withdrawn") {
    if (row.FromUserId !== viewerUserId) {
      throw new Error("Only the sender can withdraw an interest.");
    }
  } else if (row.ToUserId !== viewerUserId) {
    throw new Error("Only the recipient can respond to an interest.");
  }

  if (status === "accepted" || status === "rejected") {
    if (await areUsersBlocked(row.FromUserId, row.ToUserId)) {
      throw new Error("This interest can no longer be updated.");
    }
  }

  const { data, error: updateError } = await admin
    .from("AMVS_Interests")
    .update({
      Status: status,
      RespondedAt: new Date().toISOString(),
    })
    .eq("Id", interestId)
    .select("*")
    .single();

  if (updateError) throw updateError;
  return data as InterestRow;
}

export async function listInterestsForUser(
  userId: string,
  direction: "sent" | "received",
): Promise<InterestListItem[]> {
  const admin = createAdminClient();
  const column = direction === "sent" ? "FromUserId" : "ToUserId";
  const { data, error } = await admin
    .from("AMVS_Interests")
    .select("*")
    .eq(column, userId)
    .order("CreatedAt", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as InterestRow[];
  const counterpartIds = rows.map((row) =>
    direction === "sent" ? row.ToUserId : row.FromUserId,
  );
  const profiles = await loadProfilesByUserIds(counterpartIds);

  return rows.map((row) => {
    const counterpartyUserId =
      direction === "sent" ? row.ToUserId : row.FromUserId;
    return {
      ...row,
      CounterpartyUserId: counterpartyUserId,
      Profile: profiles.get(counterpartyUserId) ?? null,
    };
  });
}

export async function addToShortlist(userId: string, targetUserId: string) {
  if (userId === targetUserId) {
    throw new Error("You cannot shortlist yourself.");
  }
  if (await areUsersBlocked(userId, targetUserId)) {
    throw new Error("You cannot shortlist this member.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Shortlist")
    .upsert(
      { UserId: userId, TargetUserId: targetUserId },
      { onConflict: "UserId,TargetUserId", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function removeFromShortlist(
  userId: string,
  targetUserId: string,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("AMVS_Shortlist")
    .delete()
    .eq("UserId", userId)
    .eq("TargetUserId", targetUserId);
  if (error) throw error;
}

export async function listShortlist(userId: string): Promise<ShortlistItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Shortlist")
    .select("*")
    .eq("UserId", userId)
    .order("CreatedAt", { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  const profiles = await loadProfilesByUserIds(
    rows.map((row) => row.TargetUserId as string),
  );

  return rows.map((row) => ({
    Id: row.Id as string,
    UserId: row.UserId as string,
    TargetUserId: row.TargetUserId as string,
    Notes: (row.Notes as string | null) ?? null,
    CreatedAt: row.CreatedAt as string,
    Profile: profiles.get(row.TargetUserId as string) ?? null,
  }));
}

export async function blockUser(
  blockerUserId: string,
  blockedUserId: string,
  reason?: string,
) {
  if (blockerUserId === blockedUserId) {
    throw new Error("You cannot block yourself.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Blocks")
    .upsert(
      {
        BlockerUserId: blockerUserId,
        BlockedUserId: blockedUserId,
        Reason: reason?.trim() || null,
      },
      { onConflict: "BlockerUserId,BlockedUserId" },
    )
    .select("*")
    .single();

  if (error) throw error;

  // Clean related shortlist + pending interests
  await Promise.all([
    admin
      .from("AMVS_Shortlist")
      .delete()
      .eq("UserId", blockerUserId)
      .eq("TargetUserId", blockedUserId),
    admin
      .from("AMVS_Shortlist")
      .delete()
      .eq("UserId", blockedUserId)
      .eq("TargetUserId", blockerUserId),
    admin
      .from("AMVS_Interests")
      .update({
        Status: "withdrawn",
        RespondedAt: new Date().toISOString(),
      })
      .eq("Status", "pending")
      .eq("FromUserId", blockerUserId)
      .eq("ToUserId", blockedUserId),
    admin
      .from("AMVS_Interests")
      .update({
        Status: "withdrawn",
        RespondedAt: new Date().toISOString(),
      })
      .eq("Status", "pending")
      .eq("FromUserId", blockedUserId)
      .eq("ToUserId", blockerUserId),
  ]);

  return data;
}

export async function unblockUser(
  blockerUserId: string,
  blockedUserId: string,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("AMVS_Blocks")
    .delete()
    .eq("BlockerUserId", blockerUserId)
    .eq("BlockedUserId", blockedUserId);
  if (error) throw error;
}

export async function listBlocks(blockerUserId: string): Promise<BlockItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Blocks")
    .select("*")
    .eq("BlockerUserId", blockerUserId)
    .order("CreatedAt", { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  const profiles = await loadProfilesByUserIds(
    rows.map((row) => row.BlockedUserId as string),
  );

  return rows.map((row) => ({
    Id: row.Id as string,
    BlockerUserId: row.BlockerUserId as string,
    BlockedUserId: row.BlockedUserId as string,
    Reason: (row.Reason as string | null) ?? null,
    CreatedAt: row.CreatedAt as string,
    Profile: profiles.get(row.BlockedUserId as string) ?? null,
  }));
}

export async function createReport(input: {
  reporterUserId: string;
  reportedUserId: string;
  reasonCode: ReportReasonCode;
  details?: string;
}) {
  if (input.reporterUserId === input.reportedUserId) {
    throw new Error("You cannot report yourself.");
  }

  const admin = createAdminClient();

  // Prevent report spam: one open report per pair
  const { data: existing, error: existingError } = await admin
    .from("AMVS_Reports")
    .select("Id")
    .eq("ReporterUserId", input.reporterUserId)
    .eq("ReportedUserId", input.reportedUserId)
    .eq("Status", "open")
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    throw new Error("You already have an open report for this member.");
  }

  const { data, error } = await admin
    .from("AMVS_Reports")
    .insert({
      ReporterUserId: input.reporterUserId,
      ReportedUserId: input.reportedUserId,
      ReasonCode: input.reasonCode,
      Details: input.details?.trim() || null,
      Status: "open",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ReportRow;
}

export async function listReportsForAdmin(options?: {
  status?: ReportStatus;
}): Promise<ReportRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("AMVS_Reports")
    .select("*")
    .order("CreatedAt", { ascending: false })
    .limit(100);

  if (options?.status) {
    query = query.eq("Status", options.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as ReportRow[];
  const userIds = [
    ...rows.map((row) => row.ReporterUserId),
    ...rows.map((row) => row.ReportedUserId),
  ];
  const profiles = await loadProfilesByUserIds(userIds);

  return rows.map((row) => ({
    ...row,
    ReporterName: profiles.get(row.ReporterUserId)?.DisplayName ?? null,
    ReportedName: profiles.get(row.ReportedUserId)?.DisplayName ?? null,
  }));
}

export async function updateReportStatus(input: {
  reportId: string;
  adminUserId: string;
  status: "resolved" | "dismissed" | "reviewing";
  resolutionNotes?: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Reports")
    .update({
      Status: input.status,
      ResolvedByUserId: input.adminUserId,
      ResolutionNotes: input.resolutionNotes?.trim() || null,
      ResolvedAt:
        input.status === "reviewing" ? null : new Date().toISOString(),
    })
    .eq("Id", input.reportId)
    .select("*")
    .single();

  if (error) throw error;
  return data as ReportRow;
}
