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
import {
  acceptInterestAction,
  rejectInterestAction,
  withdrawInterestAction,
} from "@/lib/profile/interaction-actions";
import { listInterestsForUser } from "@/lib/services/interaction.service";
import { formatMaritalStatus } from "@/lib/utils/profile-display";

export const metadata: Metadata = {
  title: "Interests",
  robots: { index: false, follow: false },
};

type InterestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InterestsPage({ searchParams }: InterestsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/interests");

  const params = await searchParams;
  const tab =
    (Array.isArray(params.tab) ? params.tab[0] : params.tab) === "sent"
      ? "sent"
      : "received";

  let loadError: string | null = null;
  let received: Awaited<ReturnType<typeof listInterestsForUser>> = [];
  let sent: Awaited<ReturnType<typeof listInterestsForUser>> = [];

  try {
    [received, sent] = await Promise.all([
      listInterestsForUser(user.id, "received"),
      listInterestsForUser(user.id, "sent"),
    ]);
  } catch {
    loadError =
      "Interests are not ready. Run scripts/amvs-phase5-interactions.sql in Supabase, then refresh.";
  }

  const items = tab === "sent" ? sent : received;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Interests</h1>
        <p className="mt-1 text-muted-foreground">
          Send, accept, decline, or withdraw matrimonial interests.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          asChild
          size="sm"
          variant={tab === "received" ? "default" : "outline"}
        >
          <Link href="/interests?tab=received">
            Received ({received.length})
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={tab === "sent" ? "default" : "outline"}
        >
          <Link href="/interests?tab=sent">Sent ({sent.length})</Link>
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && items.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No {tab} interests yet.
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const profile = item.Profile;
          const profileHref = profile ? `/profiles/${profile.Id}` : undefined;
          return (
            <Card key={item.Id}>
              <CardHeader className="space-y-1">
                <CardTitle className="font-heading text-xl">
                  {profileHref ? (
                    <Link href={profileHref} className="hover:text-primary">
                      {profile?.DisplayName ?? "Member"}
                    </Link>
                  ) : (
                    (profile?.DisplayName ?? "Member")
                  )}
                </CardTitle>
                <CardDescription className="capitalize">
                  Status: {item.Status.replace("_", " ")}
                  {profile
                    ? ` · ${profile.Age} yrs · ${formatMaritalStatus(profile.MaritalStatus)}`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.Message ? (
                  <p className="text-sm text-muted-foreground">{item.Message}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {tab === "received" && item.Status === "pending" ? (
                    <>
                      <form action={acceptInterestAction.bind(null, item.Id, profile?.Id)}>
                        <Button type="submit" size="sm">
                          Accept
                        </Button>
                      </form>
                      <form action={rejectInterestAction.bind(null, item.Id, profile?.Id)}>
                        <Button type="submit" size="sm" variant="outline">
                          Decline
                        </Button>
                      </form>
                    </>
                  ) : null}
                  {tab === "sent" && item.Status === "pending" ? (
                    <form
                      action={withdrawInterestAction.bind(null, item.Id, profile?.Id)}
                    >
                      <Button type="submit" size="sm" variant="outline">
                        Withdraw
                      </Button>
                    </form>
                  ) : null}
                  {profileHref ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={profileHref}>View profile</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
