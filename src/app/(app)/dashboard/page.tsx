import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileCard } from "@/components/profile/profile-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { listInterestsForUser } from "@/lib/services/interaction.service";
import { getRecommendedMatches } from "@/lib/services/match.service";
import { getMyProfileBundle } from "@/lib/services/profile.service";
import { listShortlist } from "@/lib/services/interaction.service";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  if (isAdmin(user)) {
    redirect("/admin");
  }

  let completionTotal = 0;
  let sections: {
    label: string;
    earned: number;
    weight: number;
    complete: boolean;
  }[] = [];
  let profileStatus = "draft";
  let pendingReceived = 0;
  let acceptedConnections = 0;
  let shortlistCount = 0;
  let recommendations: Awaited<
    ReturnType<typeof getRecommendedMatches>
  >["matches"] = [];

  try {
    const bundle = await getMyProfileBundle(user.id);
    completionTotal = bundle.completion.total;
    sections = bundle.completion.sections;
    profileStatus = String(bundle.profile?.ProfileStatus ?? "draft");
  } catch {
    // Phase 2 SQL may not be applied yet
  }

  try {
    const [received, sent, shortlist, recommended] = await Promise.all([
      listInterestsForUser(user.id, "received"),
      listInterestsForUser(user.id, "sent"),
      listShortlist(user.id),
      getRecommendedMatches({ viewerUserId: user.id, limit: 3 }),
    ]);
    pendingReceived = received.filter((item) => item.Status === "pending").length;
    acceptedConnections =
      received.filter((item) => item.Status === "accepted").length +
      sent.filter((item) => item.Status === "accepted").length;
    shortlistCount = shortlist.length;
    recommendations = recommended.matches;
  } catch {
    // Phase 5/6 may not be applied yet
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome, {user.displayName || user.username}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending interests</CardDescription>
            <CardTitle className="font-heading text-3xl">
              {pendingReceived}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/interests?tab=received">Review</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accepted connections</CardDescription>
            <CardTitle className="font-heading text-3xl">
              {acceptedConnections}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/interests">View</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Shortlisted</CardDescription>
            <CardTitle className="font-heading text-3xl">
              {shortlistCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/shortlist">Open shortlist</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile completion · {completionTotal}%</CardTitle>
          <CardDescription>
            Status: {profileStatus}. Partner preferences power Matches. Messaging
            opens after an accepted interest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completionTotal}%` }}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sections.map((section) => (
              <div
                key={section.label}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                {section.complete ? "✓" : "○"} {section.label}{" "}
                <span className="text-muted-foreground">
                  ({section.earned}/{section.weight}%)
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/onboarding">Continue onboarding</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/matches">View matches</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/messages">Messages</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/notifications">Notifications</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profiles">Browse profiles</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {recommendations.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-semibold">
              Recommended for you
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/matches">See all</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recommendations.map(({ profile, score }) => (
              <ProfileCard
                key={profile.Id}
                profile={profile}
                matchScore={score.matchScore}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
