-- Phase 11: Performance for ~100k profiles
-- - Sargable age filters (DateOfBirth ranges)
-- - Discover / photo / message indexes
-- - Conversation inbox RPC (avoids N+1)
-- Run in Supabase SQL Editor after Phase 10.

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Matches default Discover ORDER BY IsVerified DESC, CreatedAt DESC
create index if not exists "AMVS_Profiles_Discover_Verified_CreatedAt_idx"
  on public."AMVS_Profiles" ("IsVerified" desc, "CreatedAt" desc)
  where "IsActive" = true and "ProfileStatus" = 'active';

create index if not exists "AMVS_Profiles_DateOfBirth_idx"
  on public."AMVS_Profiles" ("DateOfBirth")
  where "DateOfBirth" is not null;

create index if not exists "AMVS_Profiles_Country_idx"
  on public."AMVS_Profiles" ("Country")
  where "Country" is not null;

create index if not exists "AMVS_Profiles_HeightCm_idx"
  on public."AMVS_Profiles" ("HeightCm")
  where "HeightCm" is not null;

create index if not exists "AMVS_ProfilePhotos_UserApproved_Primary_idx"
  on public."AMVS_ProfilePhotos" ("UserId", "IsPrimary" desc, "SortOrder" asc)
  where "ModerationStatus" = 'approved';

create index if not exists "AMVS_Messages_CreatedAt_idx"
  on public."AMVS_Messages" ("CreatedAt" desc);

-- Optional trigram support for Discover free-text (safe if extension missing)
do $ext$
begin
  create extension if not exists pg_trgm;
exception
  when others then
    raise notice 'pg_trgm not available; skipping trigram indexes';
end
$ext$;

do $trgm$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute 'create index if not exists "AMVS_Profiles_DisplayName_trgm_idx"
      on public."AMVS_Profiles" using gin ("DisplayName" gin_trgm_ops)';
    execute 'create index if not exists "AMVS_Profiles_City_trgm_idx"
      on public."AMVS_Profiles" using gin ("City" gin_trgm_ops)';
  end if;
exception
  when others then
    raise notice 'Skipping trigram indexes: %', sqlerrm;
end
$trgm$;

-- ---------------------------------------------------------------------------
-- Discover RPCs: sargable age via DateOfBirth bounds
-- age >= N  => DOB <= current_date - N years
-- age <= N  => DOB >  current_date - (N+1) years
-- ---------------------------------------------------------------------------

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
    case
      when p."DateOfBirth" is null then null
      else extract(year from age(current_date, p."DateOfBirth"))::integer
    end as "Age",
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
      or (
        p."DateOfBirth" is not null
        and p."DateOfBirth" <= (current_date - make_interval(years => greatest(p_age_min, 0)))
      )
    )
    and (
      p_age_max is null
      or (
        p."DateOfBirth" is not null
        and p."DateOfBirth" > (current_date - make_interval(years => greatest(p_age_max, 0) + 1))
      )
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
      or (
        p."DateOfBirth" is not null
        and p."DateOfBirth" <= (current_date - make_interval(years => greatest(p_age_min, 0)))
      )
    )
    and (
      p_age_max is null
      or (
        p."DateOfBirth" is not null
        and p."DateOfBirth" > (current_date - make_interval(years => greatest(p_age_max, 0) + 1))
      )
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

-- ---------------------------------------------------------------------------
-- Conversation inbox in one round-trip
-- ---------------------------------------------------------------------------

create or replace function public."AMVS_ListConversationsForUser"(
  p_user_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  "Id" uuid,
  "OtherUserId" uuid,
  "LastMessageAt" timestamptz,
  "LastMessagePreview" text,
  "UnreadCount" integer,
  "OtherDisplayName" text,
  "OtherGender" text,
  "OtherCity" text,
  "OtherIsVerified" boolean
)
language sql
stable
security definer
set search_path = public
as $fn$
  with mine as (
    select
      cp."ConversationId",
      cp."LastReadAt",
      c."UserLowId",
      c."UserHighId",
      c."LastMessageAt"
    from public."AMVS_ConversationParticipants" cp
    join public."AMVS_Conversations" c on c."Id" = cp."ConversationId"
    where cp."UserId" = p_user_id
  ),
  enriched as (
    select
      m."ConversationId" as id,
      case
        when m."UserLowId" = p_user_id then m."UserHighId"
        else m."UserLowId"
      end as other_user_id,
      m."LastMessageAt",
      m."LastReadAt",
      (
        select msg."Body"
        from public."AMVS_Messages" msg
        where msg."ConversationId" = m."ConversationId"
        order by msg."CreatedAt" desc
        limit 1
      ) as last_preview,
      (
        select count(*)::integer
        from public."AMVS_Messages" msg
        where msg."ConversationId" = m."ConversationId"
          and msg."SenderUserId" <> p_user_id
          and (
            m."LastReadAt" is null
            or msg."CreatedAt" > m."LastReadAt"
          )
      ) as unread_count
    from mine m
  )
  select
    e.id as "Id",
    e.other_user_id as "OtherUserId",
    e."LastMessageAt",
    e.last_preview as "LastMessagePreview",
    e.unread_count as "UnreadCount",
    pr."DisplayName" as "OtherDisplayName",
    pr."Gender" as "OtherGender",
    pr."City" as "OtherCity",
    coalesce(pr."IsVerified", false) as "OtherIsVerified"
  from enriched e
  left join public."AMVS_Profiles" pr on pr."UserId" = e.other_user_id
  where not exists (
    select 1
    from public."AMVS_Blocks" b
    where (
      b."BlockerUserId" = p_user_id
      and b."BlockedUserId" = e.other_user_id
    )
    or (
      b."BlockerUserId" = e.other_user_id
      and b."BlockedUserId" = p_user_id
    )
  )
  order by e."LastMessageAt" desc nulls last
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$fn$;

revoke all on function public."AMVS_ListConversationsForUser"(uuid, integer, integer)
  from anon, authenticated;
grant execute on function public."AMVS_ListConversationsForUser"(uuid, integer, integer)
  to service_role;

comment on function public."AMVS_SearchDiscoverProfiles" is
  'Phase 11: Discover search with sargable DOB age bounds; limit capped at 50.';
comment on function public."AMVS_ListConversationsForUser" is
  'Phase 11: Paginated conversation inbox without app-side N+1.';
