import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChatThread } from "@/components/messages/chat-thread";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getConversationForUser,
  listMessages,
  markConversationRead,
} from "@/lib/services/messaging.service";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

type ConversationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  const { id } = await params;

  let conversation = null;
  let messages: Awaited<ReturnType<typeof listMessages>> = [];

  try {
    conversation = await getConversationForUser(id, user.id);
    messages = await listMessages(id, user.id, { limit: 80 });
    await markConversationRead(id, user.id);
  } catch {
    notFound();
  }

  if (!conversation) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/messages">Back to messages</Link>
        </Button>
        {conversation.OtherProfile?.Id ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/profiles/${conversation.OtherProfile.Id}`}>
              View profile
            </Link>
          </Button>
        ) : null}
      </div>

      <ChatThread
        conversationId={conversation.Id}
        currentUserId={user.id}
        initialMessages={messages}
        otherName={conversation.OtherProfile?.DisplayName ?? "Member"}
      />
    </div>
  );
}
