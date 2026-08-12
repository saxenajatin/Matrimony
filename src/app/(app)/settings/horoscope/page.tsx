import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HoroscopeForm } from "@/components/profile/horoscope-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getHoroscope,
  listKundliDocuments,
} from "@/lib/services/horoscope.service";

export const metadata: Metadata = {
  title: "Horoscope & Kundli",
  robots: { index: false, follow: false },
};

export default async function HoroscopeSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/horoscope");

  let horoscope = null;
  let kundliDocuments: Awaited<ReturnType<typeof listKundliDocuments>> = [];
  let loadError: string | null = null;

  try {
    [horoscope, kundliDocuments] = await Promise.all([
      getHoroscope(user.id),
      listKundliDocuments(user.id, { withSignedUrls: true }),
    ]);
  } catch {
    loadError =
      "Horoscope storage is not ready. Run scripts/amvs-phase8-horoscope.sql in Supabase, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">
            Horoscope & Kundli
          </h1>
          <p className="mt-1 text-muted-foreground">
            Optional cultural details. Hidden from others unless you enable
            privacy toggles.
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
        <HoroscopeForm
          values={horoscope as Record<string, unknown> | null}
          kundliDocuments={kundliDocuments}
        />
      )}
    </div>
  );
}
