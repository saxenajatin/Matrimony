-- Phase 7: Conversations, Messages, Notifications (AMVS_)
-- Custom auth: table access is service-role only. Realtime uses Broadcast from the app server.

create table if not exists public."AMVS_Conversations" (
  "Id" uuid primary key default gen_random_uuid(),
  "InterestId" uuid null references public."AMVS_Interests" ("Id") on delete set null,
  "UserLowId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "UserHighId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "LastMessageAt" timestamptz null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_Conversations_PairOrder_chk" check ("UserLowId" < "UserHighId"),
  constraint "AMVS_Conversations_Pair_uq" unique ("UserLowId", "UserHighId")
);

create index if not exists "AMVS_Conversations_LastMessageAt_idx"
  on public."AMVS_Conversations" ("LastMessageAt" desc nulls last);

create table if not exists public."AMVS_ConversationParticipants" (
  "Id" uuid primary key default gen_random_uuid(),
  "ConversationId" uuid not null references public."AMVS_Conversations" ("Id") on delete cascade,
  "UserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "LastReadAt" timestamptz null,
  "CreatedAt" timestamptz not null default now(),
  constraint "AMVS_ConversationParticipants_uq" unique ("ConversationId", "UserId")
);

create index if not exists "AMVS_ConversationParticipants_UserId_idx"
  on public."AMVS_ConversationParticipants" ("UserId");

create table if not exists public."AMVS_Messages" (
  "Id" uuid primary key default gen_random_uuid(),
  "ConversationId" uuid not null references public."AMVS_Conversations" ("Id") on delete cascade,
  "SenderUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "Body" text not null,
  "MessageType" text not null default 'text',
  "CreatedAt" timestamptz not null default now(),
  constraint "AMVS_Messages_Type_chk" check ("MessageType" in ('text', 'system')),
  constraint "AMVS_Messages_Body_chk" check (char_length(btrim("Body")) > 0 and char_length("Body") <= 4000)
);

create index if not exists "AMVS_Messages_ConversationId_CreatedAt_idx"
  on public."AMVS_Messages" ("ConversationId", "CreatedAt" desc);

create table if not exists public."AMVS_Notifications" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "Type" text not null,
  "Title" text not null,
  "Message" text not null,
  "Data" jsonb not null default '{}'::jsonb,
  "IsRead" boolean not null default false,
  "CreatedAt" timestamptz not null default now(),
  constraint "AMVS_Notifications_Type_chk" check (
    "Type" in (
      'interest_received',
      'interest_accepted',
      'interest_rejected',
      'new_message',
      'profile_verification',
      'system'
    )
  )
);

create index if not exists "AMVS_Notifications_UserId_CreatedAt_idx"
  on public."AMVS_Notifications" ("UserId", "CreatedAt" desc);
create index if not exists "AMVS_Notifications_UserId_Unread_idx"
  on public."AMVS_Notifications" ("UserId", "IsRead")
  where "IsRead" = false;

alter table public."AMVS_Conversations" enable row level security;
alter table public."AMVS_ConversationParticipants" enable row level security;
alter table public."AMVS_Messages" enable row level security;
alter table public."AMVS_Notifications" enable row level security;

revoke all on table public."AMVS_Conversations" from anon, authenticated;
revoke all on table public."AMVS_ConversationParticipants" from anon, authenticated;
revoke all on table public."AMVS_Messages" from anon, authenticated;
revoke all on table public."AMVS_Notifications" from anon, authenticated;

drop trigger if exists "AMVS_Conversations_SetUpdatedAt" on public."AMVS_Conversations";
create trigger "AMVS_Conversations_SetUpdatedAt"
  before update on public."AMVS_Conversations"
  for each row execute function public."AMVS_SetUpdatedAt"();

-- Realtime: enable table for future postgres_changes; app uses Broadcast for custom auth
do $do$
begin
  begin
    execute 'alter publication supabase_realtime add table public."AMVS_Messages"';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public."AMVS_Notifications"';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$do$;
