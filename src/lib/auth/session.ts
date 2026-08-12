import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getUserRoles } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthSessionSecret } from "@/lib/supabase/env";
import type { AmvsRole } from "@/types/database";

const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  roles: AmvsRole[];
};

type SessionPayload = {
  sid: string;
  uid: string;
  uname: string;
};

function secretKey() {
  return new TextEncoder().encode(getAuthSessionSecret());
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createUserSession(user: SessionUser, meta?: {
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("AMVS_CreateSession", {
    p_user_id: user.id,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt.toISOString(),
    p_user_agent: meta?.userAgent ?? null,
    p_ip_address: meta?.ipAddress ?? null,
  });

  if (error) {
    throw error;
  }

  const result = data as { ok?: boolean; sessionId?: string; error?: string };
  if (!result?.ok || !result.sessionId) {
    throw new Error(result?.error ?? "session_create_failed");
  }

  const jwt = await new SignJWT({
    sid: result.sessionId,
    uid: user.id,
    uname: user.username,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${token}.${jwt}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { token, expiresAt };
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  if (raw) {
    const token = raw.split(".")[0];
    if (token) {
      try {
        const admin = createAdminClient();
        await admin.rpc("AMVS_RevokeSession", {
          p_token_hash: hashToken(token),
        });
      } catch {
        // Best-effort revoke
      }
    }
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const separator = raw.indexOf(".");
  if (separator <= 0) return null;
  const token = raw.slice(0, separator);
  const jwt = raw.slice(separator + 1);
  if (!token || !jwt) return null;

  try {
    await jwtVerify(jwt, secretKey());
  } catch {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("AMVS_ValidateSession", {
    p_token_hash: hashToken(token),
  });

  if (error) return null;

  const result = data as {
    ok?: boolean;
    user?: {
      id: string;
      username: string;
      email: string | null;
      displayName: string | null;
    };
  };

  if (!result?.ok || !result.user) return null;

  const roles = await getUserRoles(result.user.id);

  return {
    id: result.user.id,
    username: result.user.username,
    email: result.user.email,
    displayName: result.user.displayName,
    roles,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.roles.includes("admin")) {
    throw new Error("forbidden");
  }
  return user;
}
