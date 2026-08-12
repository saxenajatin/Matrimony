"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import type { VerificationType } from "@/lib/constants/admin";
import { getUserFriendlyError } from "@/lib/errors";
import {
  createVerificationRequest,
  moderatePhoto,
  reviewVerification,
  setProfileVerified,
  setUserActive,
} from "@/lib/services/admin.service";

export type AdminActionState = {
  error?: string;
  success?: string;
};

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/verification");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/analytics");
  revalidatePath("/notifications");
  revalidatePath("/profiles");
}

export async function suspendUserAction(userId: string) {
  await requireAdminUser();
  await setUserActive(userId, false);
  revalidateAdmin();
}

export async function activateUserAction(userId: string) {
  await requireAdminUser();
  await setUserActive(userId, true);
  revalidateAdmin();
}

export async function verifyProfileAction(profileId: string) {
  const adminUser = await requireAdminUser();
  await setProfileVerified(profileId, true, adminUser.id);
  revalidateAdmin();
}

export async function unverifyProfileAction(profileId: string) {
  const adminUser = await requireAdminUser();
  await setProfileVerified(profileId, false, adminUser.id);
  revalidateAdmin();
}

export async function createVerificationAction(formData: FormData) {
  await requireAdminUser();
  const profileId = String(formData.get("profileId") || "");
  const userId = String(formData.get("userId") || "");
  const verificationType = String(
    formData.get("verificationType") || "profile",
  ) as VerificationType;
  if (!profileId || !userId) return;
  await createVerificationRequest({
    profileId,
    userId,
    verificationType,
    notes: String(formData.get("notes") || "") || undefined,
  });
  revalidateAdmin();
}

export async function reviewVerificationAction(formData: FormData) {
  const adminUser = await requireAdminUser();
  const verificationId = String(formData.get("verificationId") || "");
  const status = String(formData.get("status") || "") as
    | "verified"
    | "rejected"
    | "expired";
  if (!verificationId || !["verified", "rejected", "expired"].includes(status)) {
    return;
  }
  await reviewVerification({
    verificationId,
    adminUserId: adminUser.id,
    status,
    rejectionReason: String(formData.get("rejectionReason") || "") || undefined,
  });
  revalidateAdmin();
}

export async function approvePhotoAction(photoId: string) {
  await requireAdminUser();
  await moderatePhoto(photoId, "approved");
  revalidateAdmin();
}

export async function rejectPhotoAction(photoId: string) {
  await requireAdminUser();
  await moderatePhoto(photoId, "rejected");
  revalidateAdmin();
}

export async function adminSafeAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await requireAdminUser();
    const intent = String(formData.get("intent") || "");
    if (intent === "create_verification") {
      await createVerificationAction(formData);
      return { success: "Verification request created." };
    }
    if (intent === "review_verification") {
      await reviewVerificationAction(formData);
      return { success: "Verification updated." };
    }
    return { error: "Unknown action." };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}
