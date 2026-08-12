import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminOverviewMetrics } from "@/lib/services/admin.service";

export const metadata: Metadata = {
  title: "Admin · Analytics",
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/analytics");
  if (!isAdmin(user)) redirect("/dashboard");

  let metrics: Awaited<ReturnType<typeof getAdminOverviewMetrics>> | null =
    null;
  let loadError: string | null = null;

  try {
    metrics = await getAdminOverviewMetrics();
  } catch {
    loadError =
      "Analytics need Phase 5–9 tables. Run SETUP_ALL.sql / phase scripts if needed.";
  }

  const groups = metrics
    ? [
        {
          title: "Growth",
          items: [
            { label: "Total users", value: metrics.totalUsers },
            { label: "Active users", value: metrics.activeUsers },
            { label: "New users (7 days)", value: metrics.newUsers7d },
            { label: "Active profiles", value: metrics.activeProfiles },
          ],
        },
        {
          title: "Trust & safety",
          items: [
            { label: "Verified profiles", value: metrics.verifiedProfiles },
            {
              label: "Pending verifications",
              value: metrics.pendingVerifications,
            },
            { label: "Pending photos", value: metrics.pendingPhotos },
            { label: "Open reports", value: metrics.openReports },
          ],
        },
        {
          title: "Engagement",
          items: [
            { label: "Pending interests", value: metrics.pendingInterests },
            {
              label: "Accepted connections",
              value: metrics.acceptedInterests,
            },
            { label: "Conversations", value: metrics.conversations },
            { label: "Messages (7 days)", value: metrics.messages7d },
          ],
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Platform health snapshot for operations and growth.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">Back to overview</Link>
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="font-heading text-xl font-semibold">{group.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {group.items.map((item) => (
              <Card key={item.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="font-heading text-3xl">
                    {item.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
