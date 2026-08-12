import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminOverviewMetrics } from "@/lib/services/admin.service";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  let metrics: Awaited<ReturnType<typeof getAdminOverviewMetrics>> | null =
    null;
  let loadError: string | null = null;

  try {
    metrics = await getAdminOverviewMetrics();
  } catch {
    loadError =
      "Some admin metrics require Phase 9 SQL. Run scripts/amvs-phase9-admin.sql if counts look incomplete.";
  }

  const cards = metrics
    ? [
        { label: "Total users", value: metrics.totalUsers, href: "/admin/users" },
        { label: "Active users", value: metrics.activeUsers, href: "/admin/users" },
        {
          label: "New users (7d)",
          value: metrics.newUsers7d,
          href: "/admin/analytics",
        },
        {
          label: "Verified profiles",
          value: metrics.verifiedProfiles,
          href: "/admin/verification",
        },
        {
          label: "Pending verification",
          value: metrics.pendingVerifications,
          href: "/admin/verification",
        },
        {
          label: "Pending photos",
          value: metrics.pendingPhotos,
          href: "/admin/photos",
        },
        {
          label: "Open reports",
          value: metrics.openReports,
          href: "/admin/reports",
        },
        {
          label: "Pending interests",
          value: metrics.pendingInterests,
          href: "/admin/analytics",
        },
        {
          label: "Accepted connections",
          value: metrics.acceptedInterests,
          href: "/admin/analytics",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Admin overview</h1>
          <p className="mt-1 text-muted-foreground">
            Manage users, verification, photos, reports, and platform health.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/analytics">Full analytics</Link>
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="font-heading text-3xl">
                  {card.value}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
