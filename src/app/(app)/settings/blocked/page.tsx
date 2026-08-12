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
import { unblockUserAction } from "@/lib/profile/interaction-actions";
import { listBlocks } from "@/lib/services/interaction.service";

export const metadata: Metadata = {
  title: "Blocked members",
  robots: { index: false, follow: false },
};

export default async function BlockedSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/blocked");

  let items: Awaited<ReturnType<typeof listBlocks>> = [];
  let loadError: string | null = null;

  try {
    items = await listBlocks(user.id);
  } catch {
    loadError =
      "Blocks are not ready. Run scripts/amvs-phase5-interactions.sql in Supabase, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Blocked members</h1>
          <p className="mt-1 text-muted-foreground">
            Blocked members cannot see you in Discover, and you will not see them.
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
      ) : null}

      {!loadError && items.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          You have not blocked anyone.
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.Id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="font-heading text-lg">
                  {item.Profile?.DisplayName ?? "Member"}
                </CardTitle>
                <CardDescription>
                  Blocked {new Date(item.CreatedAt).toLocaleDateString()}
                  {item.Reason ? ` · ${item.Reason}` : ""}
                </CardDescription>
              </div>
              <form action={unblockUserAction.bind(null, item.BlockedUserId)}>
                <Button type="submit" size="sm" variant="outline">
                  Unblock
                </Button>
              </form>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </div>
  );
}
