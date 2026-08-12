import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MatchScoreCard } from "@/components/profile/match-score-card";
import { ProfileCard } from "@/components/profile/profile-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getRecommendedMatches } from "@/lib/services/match.service";

export const metadata: Metadata = {
  title: "Matches",
  robots: { index: false, follow: false },
};

export default async function MatchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/matches");

  let matches: Awaited<ReturnType<typeof getRecommendedMatches>>["matches"] =
    [];
  let hasPreferences = false;
  let loadError: string | null = null;

  try {
    const result = await getRecommendedMatches({
      viewerUserId: user.id,
      limit: 12,
    });
    matches = result.matches;
    hasPreferences = result.hasPreferences;
  } catch {
    loadError =
      "Matching is not ready. Run scripts/amvs-phase6-matching.sql (and earlier phases) in Supabase, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Matches</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Recommendations based on your partner preferences. Scores reflect
            preference fit only — not marriage compatibility.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/onboarding?step=preferences">Edit preferences</Link>
        </Button>
      </div>

      {!hasPreferences && !loadError ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You have few or no partner preferences set.{" "}
          <Link href="/onboarding?step=preferences" className="text-primary underline">
            Add preferences
          </Link>{" "}
          to improve ranking.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && matches.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No recommendations yet. Browse Discover or refine your preferences.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {matches.map(({ profile, score }) => (
          <div key={profile.Id} className="space-y-3">
            <ProfileCard profile={profile} matchScore={score.matchScore} />
            <MatchScoreCard score={score} compact />
            <Button asChild size="sm" variant="outline">
              <Link href={`/profiles/${profile.Id}`}>View full match details</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
