import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      const value = trimmed.slice(idx + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const username = "jatin.saksena1987@gmail.com";
const passwordHash =
  "$2b$12$v..bYBo2t7nXTkjxgoHDW.gRWoMW3Z/8cAza22KGij/2Aim1DVFwa";

const { data: registered, error: registerError } = await admin.rpc(
  "AMVS_RegisterUser",
  {
    p_username: username,
    p_password_hash: passwordHash,
    p_email: username,
    p_display_name: "Jatin Saksena",
  },
);

if (registerError) {
  console.error("Register RPC failed:", registerError.message);
  console.error(
    "Apply scripts/amvs-auth.sql in the Supabase SQL Editor, then re-run: node scripts/seed-admin.mjs",
  );
  process.exit(1);
}

console.log("Register result:", registered);

const { data: userRows, error: userError } = await admin
  .from("AMVS_Users")
  .select("Id, Username")
  .eq("Username", username)
  .limit(1);

if (userError) {
  // Table may only be accessible via RPC due to grants; upsert password via update RPC path
  console.log(
    "Direct table select blocked (expected with RLS). Ensuring password via UpdatePassword if user exists...",
  );
}

let userId = userRows?.[0]?.Id ?? registered?.user?.id;

if (!userId && registered?.ok === false && registered?.error === "username_taken") {
  const { data: loginRows, error: loginError } = await admin.rpc(
    "AMVS_GetUserForLogin",
    { p_username: username },
  );
  if (loginError) {
    console.error(loginError.message);
    process.exit(1);
  }
  userId = loginRows?.[0]?.Id;
  if (userId) {
    const { data: updated, error: updateError } = await admin.rpc(
      "AMVS_UpdatePassword",
      {
        p_user_id: userId,
        p_password_hash: passwordHash,
      },
    );
    if (updateError) {
      console.error(updateError.message);
      process.exit(1);
    }
    console.log("Password reset result:", updated);
  }
}

if (!userId) {
  console.error("Could not resolve admin user id");
  process.exit(1);
}

const { error: roleError } = await admin.from("AMVS_UserRoles").upsert(
  [
    { UserId: userId, Role: "admin" },
    { UserId: userId, Role: "user" },
  ],
  { onConflict: "UserId,Role" },
);

if (roleError) {
  console.error(
    "Could not assign admin role via table API:",
    roleError.message,
  );
  console.error(
    "Run the role insert from supabase/seed.sql in the SQL Editor.",
  );
} else {
  console.log("Admin roles assigned for", username);
}

console.log("Done. Login with:");
console.log("  Username:", username);
console.log("  Password: Admin@123");
