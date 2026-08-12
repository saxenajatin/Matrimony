import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/profile/communication-actions";
import { listNotifications } from "@/lib/services/notification.service";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

function hrefForNotification(data: Record<string, unknown>, type: string) {
  if (type === "new_message" && typeof data.conversationId === "string") {
    return `/messages/${data.conversationId}`;
  }
  if (
    type.startsWith("interest_") ||
    type === "interest_received" ||
    type === "interest_accepted" ||
    type === "interest_rejected"
  ) {
    return "/interests";
  }
  return "/notifications";
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  let notifications: Awaited<ReturnType<typeof listNotifications>> = [];
  let loadError: string | null = null;

  try {
    notifications = await listNotifications(user.id);
  } catch {
    loadError =
      "Notifications are not ready. Run scripts/amvs-phase7-communication.sql in Supabase, then refresh.";
  }

  const unread = notifications.filter((item) => !item.IsRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            Interests, messages, and system updates.
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" size="sm" variant="outline">
              Mark all read
            </Button>
          </form>
        ) : null}
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && notifications.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : null}

      <div className="space-y-3">
        {notifications.map((item) => {
          const href = hrefForNotification(item.Data ?? {}, item.Type);
          return (
            <Card
              key={item.Id}
              className={item.IsRead ? "opacity-80" : "border-primary/30"}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="font-heading text-lg">
                    {item.Title}
                  </CardTitle>
                  <CardDescription>{item.Message}</CardDescription>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.CreatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {!item.IsRead ? <Badge>New</Badge> : null}
                  <Button asChild size="sm" variant="outline">
                    <Link href={href}>Open</Link>
                  </Button>
                  {!item.IsRead ? (
                    <form action={markNotificationReadAction.bind(null, item.Id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Mark read
                      </Button>
                    </form>
                  ) : null}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
