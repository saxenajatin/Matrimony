"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getUserFriendlyError } from "@/lib/errors";
import {
  deleteProfilePhoto,
  setPrimaryPhoto,
  uploadProfilePhoto,
} from "@/lib/services/photo.service";
import { syncProfileCompletionByUserId } from "@/lib/services/profile.service";

export type PhotoActionState = {
  error?: string;
  success?: string;
};

async function requireMember() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/photos");
  return user;
}

export async function uploadPhotoAction(
  _prev: PhotoActionState,
  formData: FormData,
): Promise<PhotoActionState> {
  try {
    const user = await requireMember();
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose a photo to upload." };
    }

    await uploadProfilePhoto(user.id, file);
    await syncProfileCompletionByUserId(user.id);
    revalidatePath("/settings/photos");
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    revalidatePath("/profiles");
    return { success: "Photo uploaded." };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function deletePhotoAction(photoId: string) {
  const user = await requireMember();
  await deleteProfilePhoto(user.id, photoId);
  await syncProfileCompletionByUserId(user.id);
  revalidatePath("/settings/photos");
  revalidatePath("/dashboard");
  revalidatePath("/profiles");
}

export async function setPrimaryPhotoAction(photoId: string) {
  const user = await requireMember();
  await setPrimaryPhoto(user.id, photoId);
  revalidatePath("/settings/photos");
  revalidatePath("/profiles");
}
