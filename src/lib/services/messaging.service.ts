import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { areUsersBlocked } from "@/lib/services/block.service";
import { getPrivacySettings } from "@/lib/services/privacy.service";
import { createNotification } from "@/lib/services/notification.service";
import type { DiscoverProfile } from "@/lib/types/discover";

export type MessageRow = {
  Id: string;
  ConversationId: string;
  SenderUserId: string;
  Body: string;
  MessageType: "text" | "system";
  CreatedAt: string;
};

export type ConversationListItem = {
  Id: string;
  OtherUserId: string;
  OtherProfile: DiscoverProfile | null;
  LastMessageAt: string | null;
  LastMessagePreview: string | null;
  UnreadCount: number;
};

function orderedPair(userA: string, userB: string) {
  return userA < userB
    ? { low: userA, high: userB }
    : { low: userB, high: userA };
}

async function loadProfileMap(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, DiscoverProfile>();
  if (unique.length === 0) return map;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Profiles")
    .select(
      "Id, UserId, DisplayName, Gender, DateOfBirth, MaritalStatus, City, State, Country, IsVerified, ProfileCompletion",
    )
    .in("UserId", unique);
  if (error) throw error;

  for (const row of data ?? []) {
    const dob = row.DateOfBirth as string;
    const age = dob
      ? Math.floor(
          (Date.now() - new Date(dob).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : 0;
    map.set(row.UserId as string, {
      Id: row.Id as string,
      UserId: row.UserId as string,
      DisplayName: row.DisplayName as string,
      Gender: row.Gender as string,
      DateOfBirth: dob,
      Age: age,
      MaritalStatus: row.MaritalStatus as string,
      City: (row.City as string | null) ?? null,
      State: (row.State as string | null) ?? null,
      Country: (row.Country as string | null) ?? null,
      Religion: null,
      MotherTongue: null,
      Education: null,
      Occupation: null,
      HeightCm: null,
      AboutMe: null,
      IsVerified: Boolean(row.IsVerified),
      ProfileCompletion: Number(row.ProfileCompletion ?? 0),
    });
  }
  return map;
}

export async function hasAcceptedConnection(
  userA: string,
  userB: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const [forward, reverse] = await Promise.all([
    admin
      .from("AMVS_Interests")
      .select("Id")
      .eq("FromUserId", userA)
      .eq("ToUserId", userB)
      .eq("Status", "accepted")
      .maybeSingle(),
    admin
      .from("AMVS_Interests")
      .select("Id")
      .eq("FromUserId", userB)
      .eq("ToUserId", userA)
      .eq("Status", "accepted")
      .maybeSingle(),
  ]);
  if (forward.error) throw forward.error;
  if (reverse.error) throw reverse.error;
  return Boolean(forward.data || reverse.data);
}

export async function ensureConversationForUsers(options: {
  userA: string;
  userB: string;
  interestId?: string | null;
}) {
  if (options.userA === options.userB) {
    throw new Error("Invalid conversation participants.");
  }
  if (await areUsersBlocked(options.userA, options.userB)) {
    throw new Error("Messaging is unavailable for this member.");
  }

  const { low, high } = orderedPair(options.userA, options.userB);
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("AMVS_Conversations")
    .select("*")
    .eq("UserLowId", low)
    .eq("UserHighId", high)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    return existing as {
      Id: string;
      UserLowId: string;
      UserHighId: string;
      InterestId: string | null;
    };
  }

  const { data: created, error } = await admin
    .from("AMVS_Conversations")
    .insert({
      UserLowId: low,
      UserHighId: high,
      InterestId: options.interestId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;

  const conversationId = created.Id as string;
  const { error: participantsError } = await admin
    .from("AMVS_ConversationParticipants")
    .insert([
      { ConversationId: conversationId, UserId: options.userA },
      { ConversationId: conversationId, UserId: options.userB },
    ]);
  if (participantsError) throw participantsError;

  return created as {
    Id: string;
    UserLowId: string;
    UserHighId: string;
    InterestId: string | null;
  };
}

export async function assertConversationParticipant(
  conversationId: string,
  userId: string,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_ConversationParticipants")
    .select("Id, LastReadAt")
    .eq("ConversationId", conversationId)
    .eq("UserId", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Conversation not found.");
  return data as { Id: string; LastReadAt: string | null };
}

export async function getConversationForUser(
  conversationId: string,
  userId: string,
) {
  await assertConversationParticipant(conversationId, userId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Conversations")
    .select("*")
    .eq("Id", conversationId)
    .single();
  if (error) throw error;

  const otherUserId =
    data.UserLowId === userId ? data.UserHighId : data.UserLowId;
  if (await areUsersBlocked(userId, otherUserId as string)) {
    throw new Error("This conversation is unavailable.");
  }

  const profiles = await loadProfileMap([otherUserId as string]);
  return {
    Id: data.Id as string,
    OtherUserId: otherUserId as string,
    OtherProfile: profiles.get(otherUserId as string) ?? null,
    LastMessageAt: (data.LastMessageAt as string | null) ?? null,
  };
}

export async function listConversations(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<ConversationListItem[]> {
  const admin = createAdminClient();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  const { data, error } = await admin.rpc("AMVS_ListConversationsForUser", {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  if (!error && Array.isArray(data)) {
    return data.map((row) => {
      const otherUserId = row.OtherUserId as string;
      const profile = otherUserId
        ? ({
            Id: otherUserId,
            UserId: otherUserId,
            DisplayName: (row.OtherDisplayName as string | null) ?? "Member",
            Gender: (row.OtherGender as string | null) ?? "",
            DateOfBirth: "",
            Age: 0,
            MaritalStatus: "",
            City: (row.OtherCity as string | null) ?? null,
            State: null,
            Country: null,
            Religion: null,
            MotherTongue: null,
            Education: null,
            Occupation: null,
            HeightCm: null,
            AboutMe: null,
            IsVerified: Boolean(row.OtherIsVerified),
            ProfileCompletion: 0,
            PrimaryPhotoUrl: null,
          } satisfies DiscoverProfile)
        : null;
      return {
        Id: row.Id as string,
        OtherUserId: otherUserId,
        OtherProfile: profile,
        LastMessageAt: (row.LastMessageAt as string | null) ?? null,
        LastMessagePreview: (row.LastMessagePreview as string | null) ?? null,
        UnreadCount: Number(row.UnreadCount ?? 0),
      };
    });
  }

  // Fallback if Phase 11 RPC is not applied yet
  return listConversationsLegacy(userId, limit);
}

async function listConversationsLegacy(
  userId: string,
  limit: number,
): Promise<ConversationListItem[]> {
  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("AMVS_ConversationParticipants")
    .select("ConversationId, LastReadAt")
    .eq("UserId", userId);
  if (error) throw error;
  if (!memberships?.length) return [];

  const conversationIds = memberships.map((row) => row.ConversationId as string);
  const lastReadByConversation = new Map(
    memberships.map((row) => [
      row.ConversationId as string,
      (row.LastReadAt as string | null) ?? null,
    ]),
  );

  const { data: conversations, error: convError } = await admin
    .from("AMVS_Conversations")
    .select("*")
    .in("Id", conversationIds)
    .order("LastMessageAt", { ascending: false })
    .limit(limit);
  if (convError) throw convError;

  const otherIds = (conversations ?? []).map((row) =>
    row.UserLowId === userId
      ? (row.UserHighId as string)
      : (row.UserLowId as string),
  );

  const [{ data: blockRows }, profiles] = await Promise.all([
    admin
      .from("AMVS_Blocks")
      .select("BlockerUserId, BlockedUserId")
      .or(`BlockerUserId.eq.${userId},BlockedUserId.eq.${userId}`),
    loadProfileMap(otherIds),
  ]);

  const blocked = new Set<string>();
  for (const row of blockRows ?? []) {
    if (row.BlockerUserId === userId) blocked.add(row.BlockedUserId as string);
    if (row.BlockedUserId === userId) blocked.add(row.BlockerUserId as string);
  }

  const items: ConversationListItem[] = [];
  for (const row of conversations ?? []) {
    const otherUserId =
      row.UserLowId === userId
        ? (row.UserHighId as string)
        : (row.UserLowId as string);
    if (blocked.has(otherUserId)) continue;

    const { data: lastMessages } = await admin
      .from("AMVS_Messages")
      .select("Body, CreatedAt, SenderUserId")
      .eq("ConversationId", row.Id)
      .order("CreatedAt", { ascending: false })
      .limit(1);

    const last = lastMessages?.[0];
    const lastReadAt = lastReadByConversation.get(row.Id as string);
    let unreadCount = 0;
    if (last) {
      let unreadQuery = admin
        .from("AMVS_Messages")
        .select("Id", { count: "exact", head: true })
        .eq("ConversationId", row.Id)
        .neq("SenderUserId", userId);
      if (lastReadAt) {
        unreadQuery = unreadQuery.gt("CreatedAt", lastReadAt);
      }
      const unreadRes = await unreadQuery;
      unreadCount = unreadRes.count ?? 0;
    }

    items.push({
      Id: row.Id as string,
      OtherUserId: otherUserId,
      OtherProfile: profiles.get(otherUserId) ?? null,
      LastMessageAt: (row.LastMessageAt as string | null) ?? null,
      LastMessagePreview: (last?.Body as string | undefined) ?? null,
      UnreadCount: unreadCount,
    });
  }

  return items;
}

export async function listMessages(
  conversationId: string,
  userId: string,
  options?: { limit?: number; before?: string },
): Promise<MessageRow[]> {
  await assertConversationParticipant(conversationId, userId);
  const admin = createAdminClient();
  let query = admin
    .from("AMVS_Messages")
    .select("*")
    .eq("ConversationId", conversationId)
    .order("CreatedAt", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.before) {
    query = query.lt("CreatedAt", options.before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).reverse();
}

export async function listMessagesSince(
  conversationId: string,
  userId: string,
  afterCreatedAt?: string | null,
): Promise<MessageRow[]> {
  await assertConversationParticipant(conversationId, userId);
  const admin = createAdminClient();
  let query = admin
    .from("AMVS_Messages")
    .select("*")
    .eq("ConversationId", conversationId)
    .order("CreatedAt", { ascending: true })
    .limit(100);

  if (afterCreatedAt) {
    query = query.gt("CreatedAt", afterCreatedAt);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
) {
  await assertConversationParticipant(conversationId, userId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("AMVS_ConversationParticipants")
    .update({ LastReadAt: new Date().toISOString() })
    .eq("ConversationId", conversationId)
    .eq("UserId", userId);
  if (error) throw error;
}

export async function sendMessage(options: {
  conversationId: string;
  senderUserId: string;
  body: string;
}) {
  const participant = await assertConversationParticipant(
    options.conversationId,
    options.senderUserId,
  );
  void participant;

  const admin = createAdminClient();
  const { data: conversation, error: convError } = await admin
    .from("AMVS_Conversations")
    .select("*")
    .eq("Id", options.conversationId)
    .single();
  if (convError) throw convError;

  const otherUserId =
    conversation.UserLowId === options.senderUserId
      ? (conversation.UserHighId as string)
      : (conversation.UserLowId as string);

  if (await areUsersBlocked(options.senderUserId, otherUserId)) {
    throw new Error("You cannot message this member.");
  }

  const privacy = await getPrivacySettings(otherUserId).catch(() => null);
  if (privacy && !privacy.AllowMessages) {
    throw new Error("This member is not accepting messages right now.");
  }

  if (!(await hasAcceptedConnection(options.senderUserId, otherUserId))) {
    throw new Error("Messaging is only available after an accepted interest.");
  }

  const body = options.body.trim();
  const { data: message, error } = await admin
    .from("AMVS_Messages")
    .insert({
      ConversationId: options.conversationId,
      SenderUserId: options.senderUserId,
      Body: body,
      MessageType: "text",
    })
    .select("*")
    .single();
  if (error) throw error;

  await admin
    .from("AMVS_Conversations")
    .update({ LastMessageAt: message.CreatedAt })
    .eq("Id", options.conversationId);

  const profiles = await loadProfileMap([options.senderUserId]);
  const senderName =
    profiles.get(options.senderUserId)?.DisplayName ?? "A member";

  await createNotification({
    userId: otherUserId,
    type: "new_message",
    title: "New message",
    message: `${senderName}: ${body.slice(0, 120)}`,
    data: {
      conversationId: options.conversationId,
      messageId: message.Id,
      fromUserId: options.senderUserId,
    },
  }).catch(() => null);

  // Broadcast for realtime subscribers (custom-auth safe channel)
  try {
    const channel = admin.channel(`amvs-conv-${options.conversationId}`);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "message",
      payload: message,
    });
    await admin.removeChannel(channel);
  } catch {
    // Polling fallback still works
  }

  return message as MessageRow;
}

export async function openConversationWithUser(
  viewerUserId: string,
  targetUserId: string,
) {
  if (!(await hasAcceptedConnection(viewerUserId, targetUserId))) {
    throw new Error("Accept an interest before messaging.");
  }
  const conversation = await ensureConversationForUsers({
    userA: viewerUserId,
    userB: targetUserId,
  });
  return conversation.Id;
}

export async function countUnreadConversations(userId: string) {
  const items = await listConversations(userId, { limit: 100 });
  return items.filter((item) => item.UnreadCount > 0).length;
}
