"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getUserFriendlyError } from "@/lib/errors";
import {
  listMessagesSince,
  markConversationRead,
  openConversationWithUser,
  sendMessage,
} from "@/lib/services/messaging.service";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/services/notification.service";
import { sendMessageSchema } from "@/lib/validations/communication";

export type MessageActionState = {
  error?: string;
  success?: string;
};

async function requireMember(next = "/messages") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function sendMessageAction(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  try {
    const user = await requireMember();
    const parsed = sendMessageSchema.safeParse({
      conversationId: formData.get("conversationId"),
      body: formData.get("body"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid message." };
    }

    await sendMessage({
      conversationId: parsed.data.conversationId,
      senderUserId: user.id,
      body: parsed.data.body,
    });
    await markConversationRead(parsed.data.conversationId, user.id);

    revalidatePath("/messages");
    revalidatePath(`/messages/${parsed.data.conversationId}`);
    revalidatePath("/notifications");
    return { success: "Sent" };
  } catch (error) {
    return { error: getUserFriendlyError(error) };
  }
}

export async function pollMessagesAction(
  conversationId: string,
  afterCreatedAt?: string | null,
) {
  const user = await requireMember();
  const messages = await listMessagesSince(
    conversationId,
    user.id,
    afterCreatedAt,
  );
  return messages;
}

export async function markConversationReadAction(conversationId: string) {
  const user = await requireMember();
  await markConversationRead(conversationId, user.id);
  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
}

export async function startConversationAction(targetUserId: string) {
  const user = await requireMember();
  const conversationId = await openConversationWithUser(user.id, targetUserId);
  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireMember("/notifications");
  await markNotificationRead(user.id, notificationId);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireMember("/notifications");
  await markAllNotificationsRead(user.id);
  revalidatePath("/notifications");
}
