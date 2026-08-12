import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { removeShortlistAction } from "@/lib/profile/interaction-actions";
import { listShortlist } from "@/lib/services/interaction.service";
import { formatMaritalStatus } from "@/lib/utils/profile-display";

export const metadata: Metadata = {
  title: "Shortlist",
  robots: { index: false, follow: false },
};

export default async function ShortlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/shortlist");

  let items: Awaited<ReturnType<typeof listShortlist>> = [];
  let loadError: string | null = null;

  try {
    items = await listShortlist(user.id);
  } catch {
    loadError =
      "Shortlist is not ready. Run scripts/amvs-phase5-interactions.sql in Supabase, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Shortlist</h1>
        <p className="mt-1 text-muted-foreground">
          Save profiles you want to revisit privately.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && items.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          Your shortlist is empty. Open a profile and tap Shortlist.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const profile = item.Profile;
          return (
            <Card key={item.Id}>
              <CardHeader>
                <CardTitle className="font-heading text-xl">
                  {profile ? (
                    <Link
                      href={`/profiles/${profile.Id}`}
                      className="hover:text-primary"
                    >
                      {profile.DisplayName}
                    </Link>
                  ) : (
                    "Member"
                  )}
                </CardTitle>
                <CardDescription>
                  {profile
                    ? `${profile.Age} yrs · ${formatMaritalStatus(profile.MaritalStatus)}`
                    : "Profile unavailable"}
                  {profile?.City ? ` · ${profile.City}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {profile ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/profiles/${profile.Id}`}>View</Link>
                  </Button>
                ) : null}
                <form action={removeShortlistAction.bind(null, item.TargetUserId)}>
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
