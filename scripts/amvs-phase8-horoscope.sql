-- Phase 8: Horoscope + Kundli (optional, privacy-first)
-- Uploads via service-role only (custom auth)

create table if not exists public."AMVS_Horoscope" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "BirthDate" date null,
  "BirthTime" time null,
  "BirthPlace" text null,
  "BirthCity" text null,
  "BirthState" text null,
  "BirthCountry" text null,
  "Rashi" text null,
  "Nakshatra" text null,
  "NakshatraPada" integer null,
  "Lagna" text null,
  "ManglikStatus" text null,
  "Nadi" text null,
  "Gan" text null,
  "Gotra" text null,
  "Kuldevi" text null,
  "Kuldevta" text null,
  "Veda" text null,
  "Charan" text null,
  "Notes" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_Horoscope_Manglik_chk" check (
    "ManglikStatus" is null
    or "ManglikStatus" in ('yes', 'no', 'anshik', 'dont_know')
  ),
  constraint "AMVS_Horoscope_Pada_chk" check (
    "NakshatraPada" is null or ("NakshatraPada" between 1 and 4)
  )
);

create table if not exists public."AMVS_KundliDocuments" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "StoragePath" text not null unique,
  "FileName" text not null,
  "FileType" text not null,
  "FileSizeBytes" integer null,
  "IsPrivate" boolean not null default true,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create index if not exists "AMVS_KundliDocuments_UserId_idx"
  on public."AMVS_KundliDocuments" ("UserId");

alter table public."AMVS_PartnerPreferences"
  add column if not exists "ManglikPreferences" text null;
alter table public."AMVS_PartnerPreferences"
  add column if not exists "RashiPreferences" text null;
alter table public."AMVS_PartnerPreferences"
  add column if not exists "NakshatraPreferences" text null;
alter table public."AMVS_PartnerPreferences"
  add column if not exists "GotraPreferences" text null;

alter table public."AMVS_Horoscope" enable row level security;
alter table public."AMVS_KundliDocuments" enable row level security;

revoke all on table public."AMVS_Horoscope" from anon, authenticated;
revoke all on table public."AMVS_KundliDocuments" from anon, authenticated;

drop trigger if exists "AMVS_Horoscope_SetUpdatedAt" on public."AMVS_Horoscope";
create trigger "AMVS_Horoscope_SetUpdatedAt"
  before update on public."AMVS_Horoscope"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_KundliDocuments_SetUpdatedAt" on public."AMVS_KundliDocuments";
create trigger "AMVS_KundliDocuments_SetUpdatedAt"
  before update on public."AMVS_KundliDocuments"
  for each row execute function public."AMVS_SetUpdatedAt"();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'amvs-kundli',
  'amvs-kundli',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
