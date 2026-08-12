import "server-only";

import type { NotificationType } from "@/lib/constants/communication";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationRow = {
  Id: string;
  UserId: string;
  Type: NotificationType;
  Title: string;
  Message: string;
  Data: Record<string, unknown>;
  IsRead: boolean;
  CreatedAt: string;
};

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Notifications")
    .insert({
      UserId: input.userId,
      Type: input.type,
      Title: input.title,
      Message: input.message,
      Data: input.data ?? {},
      IsRead: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as NotificationRow;
}

export async function listNotifications(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean },
): Promise<NotificationRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("AMVS_Notifications")
    .select("*")
    .eq("UserId", userId)
    .order("CreatedAt", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.unreadOnly) {
    query = query.eq("IsRead", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("AMVS_Notifications")
    .select("Id", { count: "exact", head: true })
    .eq("UserId", userId)
    .eq("IsRead", false);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("AMVS_Notifications")
    .update({ IsRead: true })
    .eq("Id", notificationId)
    .eq("UserId", userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("AMVS_Notifications")
    .update({ IsRead: true })
    .eq("UserId", userId)
    .eq("IsRead", false);
  if (error) throw error;
}
