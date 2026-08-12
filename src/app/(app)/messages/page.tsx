import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { listConversations } from "@/lib/services/messaging.service";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  let conversations: Awaited<ReturnType<typeof listConversations>> = [];
  let loadError: string | null = null;

  try {
    conversations = await listConversations(user.id);
  } catch {
    loadError =
      "Messaging is not ready. Run scripts/amvs-phase7-communication.sql in Supabase, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Messages</h1>
        <p className="mt-1 text-muted-foreground">
          Chat only after an accepted interest connection.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && conversations.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No conversations yet. Accept an interest, then open Message on a
          profile.
        </div>
      ) : null}

      <div className="space-y-3">
        {conversations.map((item) => (
          <Card key={item.Id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="font-heading text-xl">
                  <Link
                    href={`/messages/${item.Id}`}
                    className="hover:text-primary"
                  >
                    {item.OtherProfile?.DisplayName ?? "Member"}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {item.LastMessagePreview
                    ? item.LastMessagePreview.slice(0, 100)
                    : "No messages yet"}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                {item.UnreadCount > 0 ? (
                  <Badge>{item.UnreadCount} new</Badge>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/messages/${item.Id}`}>Open</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {item.LastMessageAt
                  ? new Date(item.LastMessageAt).toLocaleString()
                  : "Waiting for first message"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
