import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PrivacyForm } from "@/components/profile/privacy-form";
import { Button } from "@/components/ui/button";
import { DEFAULT_PRIVACY } from "@/lib/constants/privacy";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrivacySettings } from "@/lib/services/privacy.service";

export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: false, follow: false },
};

export default async function PrivacySettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings/privacy");
  }

  let values = DEFAULT_PRIVACY;
  let loadError: string | null = null;
  try {
    values = await getPrivacySettings(user.id);
  } catch {
    loadError =
      "Privacy table is missing. Run scripts/amvs-phase3-photos-privacy.sql in Supabase, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Privacy</h1>
          <p className="mt-1 text-muted-foreground">
            Sensitive fields stay private unless you choose to share them.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to settings</Link>
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <PrivacyForm values={values} />
      )}
    </div>
  );
}
