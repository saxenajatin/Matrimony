"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getUserFriendlyError } from "@/lib/errors";
import {
  activateProfile,
  addFamilyMember,
  deleteFamilyMember,
  upsertBasicProfile,
  upsertCareer,
  upsertEducation,
  upsertFamily,
  upsertLifestyle,
  upsertLocationPhysical,
  upsertPreferences,
  upsertReligion,
} from "@/lib/services/profile.service";
import {
  basicProfileSchema,
  careerSchema,
  educationSchema,
  familyMemberSchema,
  familySchema,
  lifestyleSchema,
  locationPhysicalSchema,
  preferencesSchema,
  religionSchema,
} from "@/lib/validations/profile";

export type ProfileActionState = {
  error?: string;
  success?: string;
  completion?: number;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function requireMember() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  return user;
}

export async function saveBasicProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = basicProfileSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const completion = await upsertBasicProfile(user.id, parsed.data);
    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return {
      success: "Basic profile saved.",
      completion: completion.total,
    };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function saveLocationPhysicalAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = locationPhysicalSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const completion = await upsertLocationPhysical(user.id, parsed.data);
    revalidatePath("/onboarding");
    return { success: "Location & physical details saved.", completion: completion.total };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function saveEducationAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = educationSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const completion = await upsertEducation(user.id, parsed.data);
    revalidatePath("/onboarding");
    return { success: "Education saved.", completion: completion.total };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function saveCareerAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = careerSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const completion = await upsertCareer(user.id, parsed.data);
    revalidatePath("/onboarding");
    return { success: "Career saved.", completion: completion.total };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function saveReligionAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = religionSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const completion = await upsertReligion(user.id, parsed.data);
    revalidatePath("/onboarding");
    return { success: "Religion details saved (optional).", completion: completion.total };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function saveFamilyAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = familySchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const completion = await upsertFamily(user.id, parsed.data);
    revalidatePath("/onboarding");
    return { success: "Family information saved.", completion: completion.total };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function saveLifestyleAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = lifestyleSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const completion = await upsertLifestyle(user.id, parsed.data);
    revalidatePath("/onboarding");
    return { success: "Lifestyle saved.", completion: completion.total };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function savePreferencesAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = preferencesSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const completion = await upsertPreferences(user.id, parsed.data);
    revalidatePath("/onboarding");
    return { success: "Partner preferences saved.", completion: completion.total };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function addFamilyMemberAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const parsed = familyMemberSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    await addFamilyMember(user.id, parsed.data);
    revalidatePath("/onboarding");
    return { success: "Family member added." };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function deleteFamilyMemberAction(memberId: string) {
  const user = await requireMember();
  await deleteFamilyMember(user.id, memberId);
  revalidatePath("/onboarding");
}

export async function finishOnboardingAction(): Promise<ProfileActionState> {
  try {
    const user = await requireMember();
    const completion = await activateProfile(user.id);
    revalidatePath("/dashboard");
    revalidatePath("/profiles");
    redirect("/dashboard");
    return { success: "Profile activated.", completion: completion.total };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: getUserFriendlyError(error) };
  }
}
