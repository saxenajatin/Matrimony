"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { getUserFriendlyError } from "@/lib/errors";
import {
  addToShortlist,
  blockUser,
  createReport,
  removeFromShortlist,
  respondToInterest,
  sendInterest,
  unblockUser,
  updateReportStatus,
} from "@/lib/services/interaction.service";
import {
  ensureConversationForUsers,
} from "@/lib/services/messaging.service";
import { createNotification } from "@/lib/services/notification.service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  reportUserSchema,
  resolveReportSchema,
  sendInterestSchema,
} from "@/lib/validations/interactions";

export type InteractionActionState = {
  error?: string;
  success?: string;
};

async function requireMember(next = "/profiles") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

async function getDisplayName(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("AMVS_Profiles")
    .select("DisplayName")
    .eq("UserId", userId)
    .maybeSingle();
  return (data?.DisplayName as string | undefined) || "A member";
}

function revalidateInteractionPaths(profileId?: string) {
  revalidatePath("/profiles");
  revalidatePath("/interests");
  revalidatePath("/shortlist");
  revalidatePath("/settings/blocked");
  revalidatePath("/admin/reports");
  revalidatePath("/notifications");
  revalidatePath("/messages");
  if (profileId) revalidatePath(`/profiles/${profileId}`);
}

export async function sendInterestAction(
  _prev: InteractionActionState,
  formData: FormData,
): Promise<InteractionActionState> {
  try {
    const user = await requireMember();
    const parsed = sendInterestSchema.safeParse({
      targetUserId: formData.get("targetUserId"),
      message: formData.get("message") ?? "",
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid interest." };
    }

    await sendInterest(
      user.id,
      parsed.data.targetUserId,
      parsed.data.message || undefined,
    );

    const senderName = await getDisplayName(user.id);
    await createNotification({
      userId: parsed.data.targetUserId,
      type: "interest_received",
      title: "New interest",
      message: `${senderName} sent you an interest.`,
      data: { fromUserId: user.id },
    }).catch(() => null);

    revalidateInteractionPaths(String(formData.get("profileId") || ""));
    return { success: "Interest sent." };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function acceptInterestAction(interestId: string, profileId?: string) {
  const user = await requireMember("/interests");
  const interest = await respondToInterest(user.id, interestId, "accepted");

  await ensureConversationForUsers({
    userA: interest.FromUserId,
    userB: interest.ToUserId,
    interestId: interest.Id,
  }).catch(() => null);

  const accepterName = await getDisplayName(user.id);
  await createNotification({
    userId: interest.FromUserId,
    type: "interest_accepted",
    title: "Interest accepted",
    message: `${accepterName} accepted your interest. You can message them now.`,
    data: {
      interestId: interest.Id,
      fromUserId: user.id,
    },
  }).catch(() => null);

  revalidateInteractionPaths(profileId);
}

export async function rejectInterestAction(interestId: string, profileId?: string) {
  const user = await requireMember("/interests");
  const interest = await respondToInterest(user.id, interestId, "rejected");

  const rejecterName = await getDisplayName(user.id);
  await createNotification({
    userId: interest.FromUserId,
    type: "interest_rejected",
    title: "Interest declined",
    message: `${rejecterName} declined your interest.`,
    data: { interestId: interest.Id },
  }).catch(() => null);

  revalidateInteractionPaths(profileId);
}

export async function withdrawInterestAction(
  interestId: string,
  profileId?: string,
) {
  const user = await requireMember("/interests");
  await respondToInterest(user.id, interestId, "withdrawn");
  revalidateInteractionPaths(profileId);
}

export async function toggleShortlistAction(
  targetUserId: string,
  currentlyShortlisted: boolean,
  profileId?: string,
) {
  const user = await requireMember();
  if (currentlyShortlisted) {
    await removeFromShortlist(user.id, targetUserId);
  } else {
    await addToShortlist(user.id, targetUserId);
  }
  revalidateInteractionPaths(profileId);
  revalidatePath("/shortlist");
}

export async function removeShortlistAction(targetUserId: string) {
  const user = await requireMember("/shortlist");
  await removeFromShortlist(user.id, targetUserId);
  revalidatePath("/shortlist");
  revalidatePath("/profiles");
}

export async function blockUserAction(
  _prev: InteractionActionState,
  formData: FormData,
): Promise<InteractionActionState> {
  try {
    const user = await requireMember();
    const targetUserId = String(formData.get("targetUserId") || "");
    if (!targetUserId) return { error: "Missing member." };

    await blockUser(
      user.id,
      targetUserId,
      String(formData.get("reason") || "") || undefined,
    );
    revalidateInteractionPaths();
    redirect("/profiles");
  } catch (error) {
    // redirect throws; only map real errors
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest || "").startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: getUserFriendlyError(error) };
  }
}

export async function unblockUserAction(blockedUserId: string) {
  const user = await requireMember("/settings/blocked");
  await unblockUser(user.id, blockedUserId);
  revalidatePath("/settings/blocked");
  revalidatePath("/profiles");
}

export async function reportUserAction(
  _prev: InteractionActionState,
  formData: FormData,
): Promise<InteractionActionState> {
  try {
    const user = await requireMember();
    const parsed = reportUserSchema.safeParse({
      reportedUserId: formData.get("reportedUserId"),
      reasonCode: formData.get("reasonCode"),
      details: formData.get("details") ?? "",
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid report." };
    }

    await createReport({
      reporterUserId: user.id,
      reportedUserId: parsed.data.reportedUserId,
      reasonCode: parsed.data.reasonCode as never,
      details: parsed.data.details || undefined,
    });
    revalidatePath("/admin/reports");
    return { success: "Report submitted. Our team will review it." };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function resolveReportAction(
  _prev: InteractionActionState,
  formData: FormData,
): Promise<InteractionActionState> {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) redirect("/login?next=/admin/reports");
    if (!isAdmin(adminUser)) redirect("/dashboard");

    const parsed = resolveReportSchema.safeParse({
      reportId: formData.get("reportId"),
      status: formData.get("status"),
      resolutionNotes: formData.get("resolutionNotes") ?? "",
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid update." };
    }

    await updateReportStatus({
      reportId: parsed.data.reportId,
      adminUserId: adminUser.id,
      status: parsed.data.status,
      resolutionNotes: parsed.data.resolutionNotes || undefined,
    });
    revalidatePath("/admin/reports");
    return { success: "Report updated." };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest || "").startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }
    return { error: getUserFriendlyError(error) };
  }
}

export async function resolveReportFormAction(formData: FormData) {
  await resolveReportAction({}, formData);
}
