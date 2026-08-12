"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getUserFriendlyError } from "@/lib/errors";
import {
  deleteKundliDocument,
  upsertHoroscope,
  uploadKundliDocument,
} from "@/lib/services/horoscope.service";
import { horoscopeSchema } from "@/lib/validations/horoscope";

export type HoroscopeActionState = {
  error?: string;
  success?: string;
};

async function requireMember(next = "/settings/horoscope") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function saveHoroscopeAction(
  _prev: HoroscopeActionState,
  formData: FormData,
): Promise<HoroscopeActionState> {
  try {
    const user = await requireMember();
    const parsed = horoscopeSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid horoscope details.",
      };
    }

    await upsertHoroscope(user.id, parsed.data);
    revalidatePath("/settings/horoscope");
    revalidatePath("/onboarding");
    revalidatePath("/profiles");
    revalidatePath("/matches");
    return { success: "Horoscope details saved." };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function uploadKundliAction(
  _prev: HoroscopeActionState,
  formData: FormData,
): Promise<HoroscopeActionState> {
  try {
    const user = await requireMember();
    const file = formData.get("kundli");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose a Kundli PDF or image to upload." };
    }
    await uploadKundliDocument(user.id, file);
    revalidatePath("/settings/horoscope");
    revalidatePath("/onboarding");
    return { success: "Kundli uploaded. It stays private by default." };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function deleteKundliAction(documentId: string) {
  const user = await requireMember();
  await deleteKundliDocument(user.id, documentId);
  revalidatePath("/settings/horoscope");
  revalidatePath("/onboarding");
}
