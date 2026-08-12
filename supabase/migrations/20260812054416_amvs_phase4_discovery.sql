-- Phase 4: Discovery search, filters, pagination, single-profile fetch
-- Service-role only (custom auth). Replaces AMVS_ListDiscoverProfiles(limit, offset).

drop function if exists public."AMVS_ListDiscoverProfiles"(integer, integer);

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
    and (p_viewer_user_id is null or p."UserId" = p_viewer_user_id or (
      coalesce(priv."ProfileVisible", true) = true
      and coalesce(priv."AllowProfileViews", true) = true
    ))
  limit 1;
$fn$;

revoke all on function public."AMVS_SearchDiscoverProfiles"(
  uuid, text, text, text, integer, integer, text, text, text, text, text, text, boolean, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public."AMVS_SearchDiscoverProfiles"(
  uuid, text, text, text, integer, integer, text, text, text, text, text, text, boolean, integer, integer, integer, integer
) to service_role;

revoke all on function public."AMVS_CountDiscoverProfiles"(
  uuid, text, text, text, integer, integer, text, text, text, text, text, text, boolean, integer, integer
) from public, anon, authenticated;
grant execute on function public."AMVS_CountDiscoverProfiles"(
  uuid, text, text, text, integer, integer, text, text, text, text, text, text, boolean, integer, integer
) to service_role;

revoke all on function public."AMVS_GetDiscoverProfile"(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public."AMVS_GetDiscoverProfile"(uuid, uuid)
  to service_role;

create index if not exists "AMVS_Profiles_Discover_idx"
  on public."AMVS_Profiles" ("IsActive", "ProfileStatus", "CreatedAt" desc);

create index if not exists "AMVS_Profiles_Gender_idx"
  on public."AMVS_Profiles" ("Gender");

create index if not exists "AMVS_Profiles_MaritalStatus_idx"
  on public."AMVS_Profiles" ("MaritalStatus");

create index if not exists "AMVS_Profiles_City_idx"
  on public."AMVS_Profiles" ("City");

create index if not exists "AMVS_Profiles_State_idx"
  on public."AMVS_Profiles" ("State");
