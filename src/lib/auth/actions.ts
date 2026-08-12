"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { homePathForRoles, getUserRoles } from "@/lib/auth/roles";
import { clearUserSession, createUserSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getUserFriendlyError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export type AuthActionState = {
  error?: string;
  success?: string;
};

type LoginUserRow = {
  Id: string;
  Username: string;
  PasswordHash: string;
  Email: string | null;
  DisplayName: string | null;
  IsActive: boolean;
};

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rate = checkRateLimit({
    key: `login:${parsed.data.username.toLowerCase()}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return {
      error: `Too many login attempts. Try again in ${rate.retryAfterSec} seconds.`,
    };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("AMVS_GetUserForLogin", {
      p_username: parsed.data.username,
    });

    if (error) {
      return { error: getUserFriendlyError(error) };
    }

    const rows = (data ?? []) as LoginUserRow[];
    const user = rows[0];

    if (!user || !user.IsActive) {
      return { error: "Invalid username or password." };
    }

    const valid = await verifyPassword(
      parsed.data.password,
      user.PasswordHash,
    );
    if (!valid) {
      return { error: "Invalid username or password." };
    }

    const roles = await getUserRoles(user.Id);

    await createUserSession({
      id: user.Id,
      username: user.Username,
      email: user.Email,
      displayName: user.DisplayName,
      roles,
    });

    const requestedNext = String(formData.get("next") || "");
    const defaultHome = homePathForRoles(roles);
    const next =
      requestedNext.startsWith("/") &&
      !(roles.includes("admin") && requestedNext.startsWith("/dashboard"))
        ? requestedNext
        : defaultHome;

    revalidatePath("/", "layout");
    redirect(next);
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

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    email: formData.get("email") || "",
    acceptTerms: formData.get("acceptTerms") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rate = checkRateLimit({
    key: `register:${parsed.data.username.toLowerCase()}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.ok) {
    return {
      error: `Too many registration attempts. Try again in ${rate.retryAfterSec} seconds.`,
    };
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("AMVS_RegisterUser", {
      p_username: parsed.data.username,
      p_password_hash: passwordHash,
      p_email: parsed.data.email || null,
      p_display_name: null,
    });

    if (error) {
      return { error: getUserFriendlyError(error) };
    }

    const result = data as {
      ok?: boolean;
      error?: string;
      user?: {
        id: string;
        username: string;
        email: string | null;
        displayName: string | null;
      };
    };

    if (!result?.ok || !result.user) {
      if (result?.error === "username_taken") {
        return { error: "That username is already taken." };
      }
      return { error: "Could not create your account. Please try again." };
    }

    const roles = await getUserRoles(result.user.id);

    await createUserSession({
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      displayName: result.user.displayName,
      roles,
    });

    revalidatePath("/", "layout");
    redirect(homePathForRoles(roles));
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

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    username: formData.get("username"),
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rate = checkRateLimit({
    key: `reset:${parsed.data.username.toLowerCase()}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return {
      error: `Too many password reset attempts. Try again in ${rate.retryAfterSec} seconds.`,
    };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("AMVS_GetUserForLogin", {
      p_username: parsed.data.username,
    });

    if (error) {
      return { error: getUserFriendlyError(error) };
    }

    const rows = (data ?? []) as LoginUserRow[];
    const user = rows[0];
    if (!user) {
      return { error: "Invalid username or password." };
    }

    const valid = await verifyPassword(
      parsed.data.currentPassword,
      user.PasswordHash,
    );
    if (!valid) {
      return { error: "Current password is incorrect." };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const { data: updateData, error: updateError } = await admin.rpc(
      "AMVS_UpdatePassword",
      {
        p_user_id: user.Id,
        p_password_hash: passwordHash,
      },
    );

    if (updateError) {
      return { error: getUserFriendlyError(updateError) };
    }

    const result = updateData as { ok?: boolean; error?: string };
    if (!result?.ok) {
      return { error: "Could not update password. Please try again." };
    }

    await clearUserSession();
    revalidatePath("/", "layout");
    redirect("/login?reset=1");
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

export async function logoutAction() {
  await clearUserSession();
  // Do not revalidate protected layouts here — after the cookie is cleared,
  // re-rendering /admin (or app shell) would race with redirect("/") and
  // produce "An unexpected response was received from the server".
  redirect("/");
}

/** Kept for route compatibility; custom auth has no email reset flow. */
export async function forgotPasswordAction(): Promise<AuthActionState> {
  return {
    success:
      "Password reset by email is disabled. Use Reset password with your username and current password, or contact support.",
  };
}
