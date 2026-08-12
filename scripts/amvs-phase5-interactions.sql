-- Phase 5: Interests, Shortlist, Blocks, Reports (AMVS_)
-- Service-role only (custom auth). Also updates Discover RPCs to exclude blocks.

create table if not exists public."AMVS_Interests" (
  "Id" uuid primary key default gen_random_uuid(),
  "FromUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "ToUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "Message" text null,
  "Status" text not null default 'pending',
  "RespondedAt" timestamptz null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_Interests_Status_chk" check (
    "Status" in ('pending', 'accepted', 'rejected', 'withdrawn')
  ),
  constraint "AMVS_Interests_NotSelf_chk" check ("FromUserId" <> "ToUserId"),
  constraint "AMVS_Interests_Pair_uq" unique ("FromUserId", "ToUserId")
);

create index if not exists "AMVS_Interests_ToUserId_Status_idx"
  on public."AMVS_Interests" ("ToUserId", "Status");
create index if not exists "AMVS_Interests_FromUserId_Status_idx"
  on public."AMVS_Interests" ("FromUserId", "Status");

create table if not exists public."AMVS_Shortlist" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "TargetUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "Notes" text null,
  "CreatedAt" timestamptz not null default now(),
  constraint "AMVS_Shortlist_NotSelf_chk" check ("UserId" <> "TargetUserId"),
  constraint "AMVS_Shortlist_Pair_uq" unique ("UserId", "TargetUserId")
);

create index if not exists "AMVS_Shortlist_UserId_idx"
  on public."AMVS_Shortlist" ("UserId", "CreatedAt" desc);

create table if not exists public."AMVS_Blocks" (
  "Id" uuid primary key default gen_random_uuid(),
  "BlockerUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "BlockedUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "Reason" text null,
  "CreatedAt" timestamptz not null default now(),
  constraint "AMVS_Blocks_NotSelf_chk" check ("BlockerUserId" <> "BlockedUserId"),
  constraint "AMVS_Blocks_Pair_uq" unique ("BlockerUserId", "BlockedUserId")
);

create index if not exists "AMVS_Blocks_Blocker_idx"
  on public."AMVS_Blocks" ("BlockerUserId");
create index if not exists "AMVS_Blocks_Blocked_idx"
  on public."AMVS_Blocks" ("BlockedUserId");

create table if not exists public."AMVS_Reports" (
  "Id" uuid primary key default gen_random_uuid(),
  "ReporterUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "ReportedUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "ReasonCode" text not null,
  "Details" text null,
  "Status" text not null default 'open',
  "ResolvedAt" timestamptz null,
  "ResolvedByUserId" uuid null references public."AMVS_Users" ("Id") on delete set null,
  "ResolutionNotes" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_Reports_Reason_chk" check (
    "ReasonCode" in (
      'spam',
      'fake_profile',
      'inappropriate',
      'harassment',
      'underage',
      'other'
    )
  ),
  constraint "AMVS_Reports_Status_chk" check (
    "Status" in ('open', 'reviewing', 'resolved', 'dismissed')
  ),
  constraint "AMVS_Reports_NotSelf_chk" check ("ReporterUserId" <> "ReportedUserId")
);

create index if not exists "AMVS_Reports_Status_idx"
  on public."AMVS_Reports" ("Status", "CreatedAt" desc);
create index if not exists "AMVS_Reports_Reported_idx"
  on public."AMVS_Reports" ("ReportedUserId");

alter table public."AMVS_Interests" enable row level security;
alter table public."AMVS_Shortlist" enable row level security;
alter table public."AMVS_Blocks" enable row level security;
alter table public."AMVS_Reports" enable row level security;

revoke all on table public."AMVS_Interests" from anon, authenticated;
revoke all on table public."AMVS_Shortlist" from anon, authenticated;
revoke all on table public."AMVS_Blocks" from anon, authenticated;
revoke all on table public."AMVS_Reports" from anon, authenticated;

drop trigger if exists "AMVS_Interests_SetUpdatedAt" on public."AMVS_Interests";
create trigger "AMVS_Interests_SetUpdatedAt"
  before update on public."AMVS_Interests"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_Reports_SetUpdatedAt" on public."AMVS_Reports";
create trigger "AMVS_Reports_SetUpdatedAt"
  before update on public."AMVS_Reports"
  for each row execute function public."AMVS_SetUpdatedAt"();

-- Discover: exclude mutual blocks when viewer id is provided
create or replace function public."AMVS_SearchDiscoverProfiles"(
  p_exclude_user_id uuid default null,
  p_q text default null,
  p_gender text default null,
  p_marital_status text default null,
  p_age_min integer default null,
  p_age_max integer default null,
  p_city text default null,
  p_state text default null,
  p_country text default null,
  p_religion text default null,
  p_mother_tongue text default null,
  p_education text default null,
  p_verified_only boolean default false,
  p_height_min integer default null,
  p_height_max integer default null,
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  "Id" uuid,
  "UserId" uuid,
  "DisplayName" text,
  "Gender" text,
  "DateOfBirth" date,
  "Age" integer,
  "MaritalStatus" text,
  "City" text,
  "State" text,
  "Country" text,
  "Religion" text,
  "MotherTongue" text,
  "Education" text,
  "Occupation" text,
  "HeightCm" integer,
  "AboutMe" text,
  "IsVerified" boolean,
  "ProfileCompletion" integer
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    p."Id",
    p."UserId",
    p."DisplayName",
    p."Gender",
    p."DateOfBirth",
    extract(year from age(current_date, p."DateOfBirth"))::integer as "Age",
    p."MaritalStatus",
    p."City",
    p."State",
    p."Country",
    p."Religion",
    p."MotherTongue",
    p."Education",
    p."Occupation",
    p."HeightCm",
    p."AboutMe",
    p."IsVerified",
    p."ProfileCompletion"
  from public."AMVS_Profiles" p
  left join public."AMVS_ProfilePrivacy" priv
    on priv."UserId" = p."UserId"
  where p."IsActive" = true
    and p."ProfileStatus" = 'active'
    and (p_exclude_user_id is null or p."UserId" <> p_exclude_user_id)
    and coalesce(priv."ProfileVisible", true) = true
    and coalesce(priv."AllowProfileViews", true) = true
    and (
      p_exclude_user_id is null
      or not exists (
        select 1
        from public."AMVS_Blocks" b
        where (
          b."BlockerUserId" = p_exclude_user_id
          and b."BlockedUserId" = p."UserId"
        )
        or (
          b."BlockerUserId" = p."UserId"
          and b."BlockedUserId" = p_exclude_user_id
        )
      )
    )
    and (
      p_q is null
      or btrim(p_q) = ''
      or p."DisplayName" ilike '%' || btrim(p_q) || '%'
      or coalesce(p."City", '') ilike '%' || btrim(p_q) || '%'
      or coalesce(p."State", '') ilike '%' || btrim(p_q) || '%'
      or coalesce(p."Occupation", '') ilike '%' || btrim(p_q) || '%'
      or coalesce(p."Education", '') ilike '%' || btrim(p_q) || '%'
    )
    and (p_gender is null or btrim(p_gender) = '' or p."Gender" = btrim(p_gender))
    and (
      p_marital_status is null
      or btrim(p_marital_status) = ''
      or p."MaritalStatus" = btrim(p_marital_status)
    )
    and (
      p_age_min is null
      or extract(year from age(current_date, p."DateOfBirth"))::integer >= p_age_min
    )
    and (
      p_age_max is null
      or extract(year from age(current_date, p."DateOfBirth"))::integer <= p_age_max
    )
    and (
      p_city is null
      or btrim(p_city) = ''
      or coalesce(p."City", '') ilike btrim(p_city)
    )
    and (
      p_state is null
      or btrim(p_state) = ''
      or coalesce(p."State", '') ilike btrim(p_state)
    )
    and (
      p_country is null
      or btrim(p_country) = ''
      or coalesce(p."Country", '') ilike btrim(p_country)
    )
    and (
      p_religion is null
      or btrim(p_religion) = ''
      or (
        coalesce(priv."ShowReligion", true) = true
        and coalesce(p."Religion", '') ilike '%' || btrim(p_religion) || '%'
      )
    )
    and (
      p_mother_tongue is null
      or btrim(p_mother_tongue) = ''
      or (
        coalesce(priv."ShowReligion", true) = true
        and coalesce(p."MotherTongue", '') ilike '%' || btrim(p_mother_tongue) || '%'
      )
    )
    and (
      p_education is null
      or btrim(p_education) = ''
      or coalesce(p."Education", '') ilike '%' || btrim(p_education) || '%'
    )
    and (coalesce(p_verified_only, false) = false or p."IsVerified" = true)
    and (p_height_min is null or coalesce(p."HeightCm", 0) >= p_height_min)
    and (p_height_max is null or coalesce(p."HeightCm", 0) <= p_height_max)
  order by p."IsVerified" desc, p."CreatedAt" desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$fn$;

create or replace function public."AMVS_CountDiscoverProfiles"(
  p_exclude_user_id uuid default null,
  p_q text default null,
  p_gender text default null,
  p_marital_status text default null,
  p_age_min integer default null,
  p_age_max integer default null,
  p_city text default null,
  p_state text default null,
  p_country text default null,
  p_religion text default null,
  p_mother_tongue text default null,
  p_education text default null,
  p_verified_only boolean default false,
  p_height_min integer default null,
  p_height_max integer default null
)
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  select count(*)::integer
  from public."AMVS_Profiles" p
  left join public."AMVS_ProfilePrivacy" priv
    on priv."UserId" = p."UserId"
  where p."IsActive" = true
    and p."ProfileStatus" = 'active'
    and (p_exclude_user_id is null or p."UserId" <> p_exclude_user_id)
    and coalesce(priv."ProfileVisible", true) = true
    and coalesce(priv."AllowProfileViews", true) = true
    and (
      p_exclude_user_id is null
      or not exists (
        select 1
        from public."AMVS_Blocks" b
        where (
          b."BlockerUserId" = p_exclude_user_id
          and b."BlockedUserId" = p."UserId"
        )
        or (
          b."BlockerUserId" = p."UserId"
          and b."BlockedUserId" = p_exclude_user_id
        )
      )
    )
    and (
      p_q is null
      or btrim(p_q) = ''
      or p."DisplayName" ilike '%' || btrim(p_q) || '%'
      or coalesce(p."City", '') ilike '%' || btrim(p_q) || '%'
      or coalesce(p."State", '') ilike '%' || btrim(p_q) || '%'
      or coalesce(p."Occupation", '') ilike '%' || btrim(p_q) || '%'
      or coalesce(p."Education", '') ilike '%' || btrim(p_q) || '%'
    )
    and (p_gender is null or btrim(p_gender) = '' or p."Gender" = btrim(p_gender))
    and (
      p_marital_status is null
      or btrim(p_marital_status) = ''
      or p."MaritalStatus" = btrim(p_marital_status)
    )
    and (
      p_age_min is null
      or extract(year from age(current_date, p."DateOfBirth"))::integer >= p_age_min
    )
    and (
      p_age_max is null
      or extract(year from age(current_date, p."DateOfBirth"))::integer <= p_age_max
    )
    and (
      p_city is null
      or btrim(p_city) = ''
      or coalesce(p."City", '') ilike btrim(p_city)
    )
    and (
      p_state is null
      or btrim(p_state) = ''
      or coalesce(p."State", '') ilike btrim(p_state)
    )
    and (
      p_country is null
      or btrim(p_country) = ''
      or coalesce(p."Country", '') ilike btrim(p_country)
    )
    and (
      p_religion is null
      or btrim(p_religion) = ''
      or (
        coalesce(priv."ShowReligion", true) = true
        and coalesce(p."Religion", '') ilike '%' || btrim(p_religion) || '%'
      )
    )
    and (
      p_mother_tongue is null
      or btrim(p_mother_tongue) = ''
      or (
        coalesce(priv."ShowReligion", true) = true
        and coalesce(p."MotherTongue", '') ilike '%' || btrim(p_mother_tongue) || '%'
      )
    )
    and (
      p_education is null
      or btrim(p_education) = ''
      or coalesce(p."Education", '') ilike '%' || btrim(p_education) || '%'
    )
    and (coalesce(p_verified_only, false) = false or p."IsVerified" = true)
    and (p_height_min is null or coalesce(p."HeightCm", 0) >= p_height_min)
    and (p_height_max is null or coalesce(p."HeightCm", 0) <= p_height_max);
$fn$;

create or replace function public."AMVS_GetDiscoverProfile"(
  p_profile_id uuid,
  p_viewer_user_id uuid default null
)
returns table (
  "Id" uuid,
  "UserId" uuid,
  "DisplayName" text,
  "Gender" text,
  "DateOfBirth" date,
  "Age" integer,
  "MaritalStatus" text,
  "City" text,
  "State" text,
  "Country" text,
  "Religion" text,
  "MotherTongue" text,
  "Education" text,
  "Occupation" text,
  "HeightCm" integer,
  "AboutMe" text,
  "IsVerified" boolean,
  "ProfileCompletion" integer
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    p."Id",
    p."UserId",
    p."DisplayName",
    p."Gender",
    p."DateOfBirth",
    extract(year from age(current_date, p."DateOfBirth"))::integer as "Age",
    p."MaritalStatus",
    p."City",
    p."State",
    p."Country",
    p."Religion",
    p."MotherTongue",
    p."Education",
    p."Occupation",
    p."HeightCm",
    p."AboutMe",
    p."IsVerified",
    p."ProfileCompletion"
  from public."AMVS_Profiles" p
  left join public."AMVS_ProfilePrivacy" priv
    on priv."UserId" = p."UserId"
  where p."Id" = p_profile_id
    and p."IsActive" = true
    and p."ProfileStatus" = 'active'
    and (
      p_viewer_user_id is null
      or p."UserId" = p_viewer_user_id
      or (
        coalesce(priv."ProfileVisible", true) = true
        and coalesce(priv."AllowProfileViews", true) = true
        and not exists (
          select 1
          from public."AMVS_Blocks" b
          where (
            b."BlockerUserId" = p_viewer_user_id
            and b."BlockedUserId" = p."UserId"
          )
          or (
            b."BlockerUserId" = p."UserId"
            and b."BlockedUserId" = p_viewer_user_id
          )
        )
      )
    )
  limit 1;
$fn$;
