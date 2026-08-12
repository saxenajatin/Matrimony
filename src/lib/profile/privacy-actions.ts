"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DEFAULT_PRIVACY,
  type PrivacyToggleKey,
} from "@/lib/constants/privacy";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserFriendlyError } from "@/lib/errors";
import { updatePrivacySettings } from "@/lib/services/privacy.service";

export type PrivacyActionState = {
  error?: string;
  success?: string;
};

export async function savePrivacyAction(
  _prev: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/settings/privacy");

    const updates = {} as Partial<Record<PrivacyToggleKey, boolean>>;
    for (const key of Object.keys(DEFAULT_PRIVACY) as PrivacyToggleKey[]) {
      updates[key] = formData.get(key) === "on";
    }

    await updatePrivacySettings(user.id, updates);
    revalidatePath("/settings/privacy");
    revalidatePath("/profiles");
    return { success: "Privacy settings saved." };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}
