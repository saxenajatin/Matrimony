-- Phase 9: Admin verification records
-- Service-role only (custom auth). Photo/user moderation uses existing tables.

create table if not exists public."AMVS_ProfileVerifications" (
  "Id" uuid primary key default gen_random_uuid(),
  "ProfileId" uuid not null references public."AMVS_Profiles" ("Id") on delete cascade,
  "UserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "VerificationType" text not null,
  "Status" text not null default 'pending',
  "DocumentType" text null,
  "DocumentReference" text null,
  "VerifiedByUserId" uuid null references public."AMVS_Users" ("Id") on delete set null,
  "VerifiedAt" timestamptz null,
  "RejectionReason" text null,
  "Notes" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_ProfileVerifications_Type_chk" check (
    "VerificationType" in (
      'email',
      'phone',
      'photo',
      'identity',
      'profile',
      'education',
      'employment'
    )
  ),
  constraint "AMVS_ProfileVerifications_Status_chk" check (
    "Status" in ('pending', 'verified', 'rejected', 'expired')
  )
);

create index if not exists "AMVS_ProfileVerifications_Status_idx"
  on public."AMVS_ProfileVerifications" ("Status", "CreatedAt" desc);
create index if not exists "AMVS_ProfileVerifications_ProfileId_idx"
  on public."AMVS_ProfileVerifications" ("ProfileId");
create index if not exists "AMVS_ProfileVerifications_UserId_idx"
  on public."AMVS_ProfileVerifications" ("UserId");

alter table public."AMVS_ProfileVerifications" enable row level security;
revoke all on table public."AMVS_ProfileVerifications" from anon, authenticated;

drop trigger if exists "AMVS_ProfileVerifications_SetUpdatedAt"
  on public."AMVS_ProfileVerifications";
create trigger "AMVS_ProfileVerifications_SetUpdatedAt"
  before update on public."AMVS_ProfileVerifications"
  for each row execute function public."AMVS_SetUpdatedAt"();

-- Helpful admin listing indexes
create index if not exists "AMVS_Users_CreatedAt_idx"
  on public."AMVS_Users" ("CreatedAt" desc);
create index if not exists "AMVS_ProfilePhotos_Moderation_idx"
  on public."AMVS_ProfilePhotos" ("ModerationStatus", "CreatedAt" desc);
