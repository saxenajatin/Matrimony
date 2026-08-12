-- Phase 3: photos + privacy (AMVS_)
-- Uploads go through server service-role (custom auth; no Supabase Auth JWT)

create table if not exists public."AMVS_ProfilePhotos" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "StoragePath" text not null unique,
  "FileName" text not null,
  "FileType" text not null,
  "FileSizeBytes" integer null,
  "IsPrimary" boolean not null default false,
  "SortOrder" integer not null default 0,
  "ModerationStatus" text not null default 'pending',
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_ProfilePhotos_ModerationStatus_chk" check (
    "ModerationStatus" in ('pending', 'approved', 'rejected')
  )
);

create index if not exists "AMVS_ProfilePhotos_UserId_idx"
  on public."AMVS_ProfilePhotos" ("UserId");
create index if not exists "AMVS_ProfilePhotos_UserId_Primary_idx"
  on public."AMVS_ProfilePhotos" ("UserId", "IsPrimary");

create table if not exists public."AMVS_ProfilePrivacy" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "ProfileVisible" boolean not null default true,
  "ShowPhone" boolean not null default false,
  "ShowEmail" boolean not null default false,
  "ShowIncome" boolean not null default false,
  "ShowFamilyDetails" boolean not null default true,
  "ShowReligion" boolean not null default true,
  "ShowCaste" boolean not null default false,
  "ShowHoroscope" boolean not null default false,
  "ShowKundli" boolean not null default false,
  "ShowChildren" boolean not null default false,
  "ShowPhotos" boolean not null default true,
  "AllowProfileViews" boolean not null default true,
  "AllowInterests" boolean not null default true,
  "AllowMessages" boolean not null default true,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

alter table public."AMVS_ProfilePhotos" enable row level security;
alter table public."AMVS_ProfilePrivacy" enable row level security;

revoke all on table public."AMVS_ProfilePhotos" from anon, authenticated;
revoke all on table public."AMVS_ProfilePrivacy" from anon, authenticated;

drop trigger if exists "AMVS_ProfilePhotos_SetUpdatedAt" on public."AMVS_ProfilePhotos";
create trigger "AMVS_ProfilePhotos_SetUpdatedAt"
  before update on public."AMVS_ProfilePhotos"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_ProfilePrivacy_SetUpdatedAt" on public."AMVS_ProfilePrivacy";
create trigger "AMVS_ProfilePrivacy_SetUpdatedAt"
  before update on public."AMVS_ProfilePrivacy"
  for each row execute function public."AMVS_SetUpdatedAt"();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'amvs-profile-photos',
  'amvs-profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public."AMVS_ProfilePrivacy" ("UserId")
select u."Id"
from public."AMVS_Users" u
on conflict ("UserId") do nothing;
