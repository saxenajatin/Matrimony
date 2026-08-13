-- Run this in Supabase SQL Editor for project qvpkxvaowqwtvfsxofaz
-- Custom username/password auth (NO Supabase Auth). AMVS_ prefix required.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.has_role(public.app_role);
drop table if exists public.user_roles;
drop type if exists public.app_role;

create table if not exists public."AMVS_Users" (
  "Id" uuid primary key default gen_random_uuid(),
  "Username" text not null,
  "PasswordHash" text not null,
  "Email" text null,
  "DisplayName" text null,
  "IsActive" boolean not null default true,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_Users_Username_key" unique ("Username"),
  constraint "AMVS_Users_Username_format_chk"
    check ("Username" ~ '^[a-zA-Z0-9._@+-]{3,64}$')
);

create index if not exists "AMVS_Users_IsActive_idx"
  on public."AMVS_Users" ("IsActive");

create table if not exists public."AMVS_UserRoles" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "Role" text not null default 'user',
  "CreatedAt" timestamptz not null default now(),
  constraint "AMVS_UserRoles_Role_chk" check ("Role" in ('user', 'admin')),
  constraint "AMVS_UserRoles_UserId_Role_key" unique ("UserId", "Role")
);

create index if not exists "AMVS_UserRoles_UserId_idx"
  on public."AMVS_UserRoles" ("UserId");

create table if not exists public."AMVS_Sessions" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "TokenHash" text not null unique,
  "ExpiresAt" timestamptz not null,
  "RevokedAt" timestamptz null,
  "CreatedAt" timestamptz not null default now(),
  "UserAgent" text null,
  "IpAddress" text null
);

create index if not exists "AMVS_Sessions_UserId_idx"
  on public."AMVS_Sessions" ("UserId");

create index if not exists "AMVS_Sessions_ExpiresAt_idx"
  on public."AMVS_Sessions" ("ExpiresAt");

create or replace function public."AMVS_SetUpdatedAt"()
returns trigger
language plpgsql
as $$
begin
  new."UpdatedAt" = now();
  return new;
end;
$$;

drop trigger if exists "AMVS_Users_SetUpdatedAt" on public."AMVS_Users";
create trigger "AMVS_Users_SetUpdatedAt"
  before update on public."AMVS_Users"
  for each row execute function public."AMVS_SetUpdatedAt"();

create or replace function public."AMVS_HasRole"(
  p_user_id uuid,
  p_role text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."AMVS_UserRoles" r
    join public."AMVS_Users" u on u."Id" = r."UserId"
    where r."UserId" = p_user_id
      and r."Role" = p_role
      and u."IsActive" = true
  );
$$;

create or replace function public."AMVS_RegisterUser"(
  p_username text,
  p_password_hash text,
  p_email text default null,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_username text := lower(trim(p_username));
begin
  if v_username is null or length(v_username) < 3 then
    return jsonb_build_object('ok', false, 'error', 'invalid_username');
  end if;

  if p_password_hash is null or length(p_password_hash) < 20 then
    return jsonb_build_object('ok', false, 'error', 'invalid_password_hash');
  end if;

  if exists (
    select 1 from public."AMVS_Users" u where u."Username" = v_username
  ) then
    return jsonb_build_object('ok', false, 'error', 'username_taken');
  end if;

  insert into public."AMVS_Users" (
    "Username",
    "PasswordHash",
    "Email",
    "DisplayName"
  )
  values (
    v_username,
    p_password_hash,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_display_name, '')), '')
  )
  returning "Id" into v_user_id;

  insert into public."AMVS_UserRoles" ("UserId", "Role")
  values (v_user_id, 'user')
  on conflict ("UserId", "Role") do nothing;

  return jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object(
      'id', v_user_id,
      'username', v_username,
      'email', nullif(trim(coalesce(p_email, '')), ''),
      'displayName', nullif(trim(coalesce(p_display_name, '')), '')
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'username_taken');
  when check_violation then
    return jsonb_build_object('ok', false, 'error', 'invalid_username');
end;
$$;

create or replace function public."AMVS_GetUserForLogin"(
  p_username text
)
returns table (
  "Id" uuid,
  "Username" text,
  "PasswordHash" text,
  "Email" text,
  "DisplayName" text,
  "IsActive" boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u."Id",
    u."Username",
    u."PasswordHash",
    u."Email",
    u."DisplayName",
    u."IsActive"
  from public."AMVS_Users" u
  where u."Username" = lower(trim(p_username))
  limit 1;
$$;

create or replace function public."AMVS_CreateSession"(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_user_agent text default null,
  p_ip_address text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if not exists (
    select 1
    from public."AMVS_Users" u
    where u."Id" = p_user_id
      and u."IsActive" = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'user_inactive');
  end if;

  insert into public."AMVS_Sessions" (
    "UserId",
    "TokenHash",
    "ExpiresAt",
    "UserAgent",
    "IpAddress"
  )
  values (
    p_user_id,
    p_token_hash,
    p_expires_at,
    p_user_agent,
    p_ip_address
  )
  returning "Id" into v_session_id;

  return jsonb_build_object(
    'ok', true,
    'sessionId', v_session_id
  );
end;
$$;

create or replace function public."AMVS_ValidateSession"(
  p_token_hash text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select
    s."Id" as session_id,
    s."ExpiresAt" as expires_at,
    s."RevokedAt" as revoked_at,
    u."Id" as user_id,
    u."Username" as username,
    u."Email" as email,
    u."DisplayName" as display_name,
    u."IsActive" as is_active
  into v_row
  from public."AMVS_Sessions" s
  join public."AMVS_Users" u on u."Id" = s."UserId"
  where s."TokenHash" = p_token_hash
  limit 1;

  if v_row.session_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;

  if v_row.revoked_at is not null or v_row.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired_session');
  end if;

  if v_row.is_active is not true then
    return jsonb_build_object('ok', false, 'error', 'user_inactive');
  end if;

  return jsonb_build_object(
    'ok', true,
    'sessionId', v_row.session_id,
    'user', jsonb_build_object(
      'id', v_row.user_id,
      'username', v_row.username,
      'email', v_row.email,
      'displayName', v_row.display_name
    )
  );
end;
$$;

create or replace function public."AMVS_RevokeSession"(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public."AMVS_Sessions" s
  set "RevokedAt" = now()
  where s."TokenHash" = p_token_hash
    and s."RevokedAt" is null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public."AMVS_UpdatePassword"(
  p_user_id uuid,
  p_password_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_password_hash is null or length(p_password_hash) < 20 then
    return jsonb_build_object('ok', false, 'error', 'invalid_password_hash');
  end if;

  update public."AMVS_Users" u
  set "PasswordHash" = p_password_hash,
      "UpdatedAt" = now()
  where u."Id" = p_user_id
    and u."IsActive" = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  update public."AMVS_Sessions" s
  set "RevokedAt" = now()
  where s."UserId" = p_user_id
    and s."RevokedAt" is null;

  return jsonb_build_object('ok', true);
end;
$$;

alter table public."AMVS_Users" enable row level security;
alter table public."AMVS_UserRoles" enable row level security;
alter table public."AMVS_Sessions" enable row level security;

revoke all on table public."AMVS_Users" from anon, authenticated;
revoke all on table public."AMVS_UserRoles" from anon, authenticated;
revoke all on table public."AMVS_Sessions" from anon, authenticated;

revoke all on function public."AMVS_HasRole"(uuid, text) from public, anon, authenticated;
revoke all on function public."AMVS_RegisterUser"(text, text, text, text) from public, anon, authenticated;
revoke all on function public."AMVS_GetUserForLogin"(text) from public, anon, authenticated;
revoke all on function public."AMVS_CreateSession"(uuid, text, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public."AMVS_ValidateSession"(text) from public, anon, authenticated;
revoke all on function public."AMVS_RevokeSession"(text) from public, anon, authenticated;
revoke all on function public."AMVS_UpdatePassword"(uuid, text) from public, anon, authenticated;

grant execute on function public."AMVS_HasRole"(uuid, text) to service_role;
grant execute on function public."AMVS_RegisterUser"(text, text, text, text) to service_role;
grant execute on function public."AMVS_GetUserForLogin"(text) to service_role;
grant execute on function public."AMVS_CreateSession"(uuid, text, timestamptz, text, text) to service_role;
grant execute on function public."AMVS_ValidateSession"(text) to service_role;
grant execute on function public."AMVS_RevokeSession"(text) to service_role;
grant execute on function public."AMVS_UpdatePassword"(uuid, text) to service_role;

-- Default admin (also prefilled on /login)
insert into public."AMVS_Users" (
  "Username",
  "PasswordHash",
  "Email",
  "DisplayName",
  "IsActive"
)
values (
  'jatin.saksena1987@gmail.com',
  '$2b$12$' || 'v..bYBo2t7nXTkjxgoHDW.gRWoMW3Z/8cAza22KGij/2Aim1DVFwa',
  'jatin.saksena1987@gmail.com',
  'Jatin Saksena',
  true
)
on conflict ("Username") do update
set
  "PasswordHash" = excluded."PasswordHash",
  "Email" = excluded."Email",
  "DisplayName" = excluded."DisplayName",
  "IsActive" = true,
  "UpdatedAt" = now();

insert into public."AMVS_UserRoles" ("UserId", "Role")
select u."Id", 'admin'
from public."AMVS_Users" u
where u."Username" = 'jatin.saksena1987@gmail.com'
on conflict ("UserId", "Role") do nothing;

insert into public."AMVS_UserRoles" ("UserId", "Role")
select u."Id", 'user'
from public."AMVS_Users" u
where u."Username" = 'jatin.saksena1987@gmail.com'
on conflict ("UserId", "Role") do nothing;
-- AMVS_Profiles + 10 dummy matrimonial profiles
-- Safe for Supabase SQL Editor (no DO $$ block / no RETURNING INTO)

create table if not exists public."AMVS_Profiles" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "CreatedByUserId" uuid not null references public."AMVS_Users" ("Id") on delete cascade,
  "ProfileFor" text not null default 'self',
  "FirstName" text not null,
  "MiddleName" text null,
  "LastName" text not null,
  "DisplayName" text not null,
  "Gender" text not null,
  "DateOfBirth" date not null,
  "MaritalStatus" text not null default 'never_married',
  "AboutMe" text null,
  "City" text null,
  "State" text null,
  "Country" text null default 'India',
  "Religion" text null,
  "MotherTongue" text null,
  "Education" text null,
  "Occupation" text null,
  "HeightCm" integer null,
  "ProfileStatus" text not null default 'active',
  "ProfileCompletion" integer not null default 0,
  "IsVerified" boolean not null default false,
  "IsActive" boolean not null default true,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_Profiles_ProfileFor_chk" check (
    "ProfileFor" in (
      'self', 'son', 'daughter', 'brother', 'sister', 'relative', 'friend', 'other'
    )
  ),
  constraint "AMVS_Profiles_Gender_chk" check ("Gender" in ('male', 'female', 'other')),
  constraint "AMVS_Profiles_MaritalStatus_chk" check (
    "MaritalStatus" in (
      'never_married', 'divorced', 'widowed', 'separated', 'awaiting_divorce'
    )
  ),
  constraint "AMVS_Profiles_Status_chk" check (
    "ProfileStatus" in ('draft', 'active', 'hidden', 'suspended')
  ),
  constraint "AMVS_Profiles_Completion_chk" check (
    "ProfileCompletion" >= 0 and "ProfileCompletion" <= 100
  )
);

create index if not exists "AMVS_Profiles_Gender_idx"
  on public."AMVS_Profiles" ("Gender");
create index if not exists "AMVS_Profiles_Status_idx"
  on public."AMVS_Profiles" ("ProfileStatus", "IsActive");
create index if not exists "AMVS_Profiles_City_idx"
  on public."AMVS_Profiles" ("City");

drop trigger if exists "AMVS_Profiles_SetUpdatedAt" on public."AMVS_Profiles";
create trigger "AMVS_Profiles_SetUpdatedAt"
  before update on public."AMVS_Profiles"
  for each row execute function public."AMVS_SetUpdatedAt"();

alter table public."AMVS_Profiles" enable row level security;
revoke all on table public."AMVS_Profiles" from anon, authenticated;

create or replace function public."AMVS_ListDiscoverProfiles"(
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  "Id" uuid,
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
  where p."IsActive" = true
    and p."ProfileStatus" = 'active'
  order by p."CreatedAt" desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$fn$;

revoke all on function public."AMVS_ListDiscoverProfiles"(integer, integer)
  from public, anon, authenticated;
grant execute on function public."AMVS_ListDiscoverProfiles"(integer, integer)
  to service_role;

-- Dummy password: Dummy@123
-- Hash split so SQL editors do not confuse $...$ with dollar-quoting
-- Full hash: $2b$12$2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu

insert into public."AMVS_Users" (
  "Username", "PasswordHash", "Email", "DisplayName", "IsActive"
)
values
  ('demo.priya.sharma', '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.priya.sharma@example.com', 'Priya Sharma', true),
  ('demo.rahul.patel',  '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.rahul.patel@example.com',  'Rahul Patel',  true),
  ('demo.ananya.iyer',  '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.ananya.iyer@example.com',  'Ananya Iyer',  true),
  ('demo.arjun.singh',  '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.arjun.singh@example.com',  'Arjun Singh',  true),
  ('demo.fatima.khan',  '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.fatima.khan@example.com',  'Fatima Khan',  true),
  ('demo.vikram.mehta', '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.vikram.mehta@example.com', 'Vikram Mehta', true),
  ('demo.neha.joshi',   '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.neha.joshi@example.com',   'Neha Joshi',   true),
  ('demo.rohan.das',    '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.rohan.das@example.com',    'Rohan Das',    true),
  ('demo.simran.kaur',  '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.simran.kaur@example.com',  'Simran Kaur',  true),
  ('demo.aditya.nair',  '$2b$12$' || '2wNI8l8a50SYCd7tXzAPx.YakaGftDP7XURHZ4qpVQ.NYSJB1toUu', 'demo.aditya.nair@example.com',  'Aditya Nair',  true)
on conflict ("Username") do update
set
  "PasswordHash" = excluded."PasswordHash",
  "Email" = excluded."Email",
  "DisplayName" = excluded."DisplayName",
  "IsActive" = true,
  "UpdatedAt" = now();

insert into public."AMVS_UserRoles" ("UserId", "Role")
select u."Id", 'user'
from public."AMVS_Users" u
where u."Username" in (
  'demo.priya.sharma', 'demo.rahul.patel', 'demo.ananya.iyer', 'demo.arjun.singh',
  'demo.fatima.khan', 'demo.vikram.mehta', 'demo.neha.joshi', 'demo.rohan.das',
  'demo.simran.kaur', 'demo.aditya.nair'
)
on conflict ("UserId", "Role") do nothing;

insert into public."AMVS_Profiles" (
  "UserId", "CreatedByUserId", "ProfileFor",
  "FirstName", "LastName", "DisplayName", "Gender", "DateOfBirth",
  "MaritalStatus", "AboutMe", "City", "State", "Country",
  "Religion", "MotherTongue", "Education", "Occupation", "HeightCm",
  "ProfileStatus", "ProfileCompletion", "IsVerified", "IsActive"
)
select
  u."Id", u."Id", 'self',
  d.first_name, d.last_name, d.first_name || ' ' || d.last_name, d.gender, d.dob,
  'never_married', d.about_me, d.city, d.state, 'India',
  d.religion, d.mother_tongue, d.education, d.occupation, d.height_cm,
  'active', 85, d.is_verified, true
from (
  values
    ('demo.priya.sharma', 'Priya',  'Sharma', 'female', date '1996-03-14', 'Ahmedabad',  'Gujarat',       'Hindu',  'Gujarati',  'MBA',    'Marketing Manager',     162, 'Family-oriented, enjoys travel and classical music.', true),
    ('demo.rahul.patel',  'Rahul',  'Patel',  'male',   date '1992-07-22', 'Surat',      'Gujarat',       'Hindu',  'Gujarati',  'B.Tech', 'Software Engineer',     175, 'Looking for a life partner who values honesty and growth.', true),
    ('demo.ananya.iyer',  'Ananya', 'Iyer',   'female', date '1995-11-05', 'Chennai',    'Tamil Nadu',    'Hindu',  'Tamil',     'M.Sc',   'Research Analyst',      160, 'Quiet weekends, good books, and South Indian food.', false),
    ('demo.arjun.singh',  'Arjun',  'Singh',  'male',   date '1990-01-18', 'Delhi',      'Delhi',         'Sikh',   'Punjabi',   'CA',     'Chartered Accountant',  178, 'Close to family, enjoys cricket and community service.', true),
    ('demo.fatima.khan',  'Fatima', 'Khan',   'female', date '1994-09-09', 'Hyderabad',  'Telangana',     'Muslim', 'Urdu',      'B.Arch', 'Architect',             165, 'Creative professional seeking a respectful, supportive partner.', false),
    ('demo.vikram.mehta', 'Vikram', 'Mehta',  'male',   date '1989-05-30', 'Mumbai',     'Maharashtra',   'Jain',   'Gujarati',  'MBA',    'Business Owner',        172, 'Entrepreneur with traditional values and a modern outlook.', false),
    ('demo.neha.joshi',   'Neha',   'Joshi',  'female', date '1997-12-21', 'Pune',       'Maharashtra',   'Hindu',  'Marathi',   'B.Des',  'UX Designer',           158, 'Design lover, coffee enthusiast, and weekend trekker.', false),
    ('demo.rohan.das',    'Rohan',  'Das',    'male',   date '1993-04-02', 'Kolkata',    'West Bengal',   'Hindu',  'Bengali',   'MBBS',   'Doctor',                170, 'Dedicated to medicine and looking for a compassionate partner.', false),
    ('demo.simran.kaur',  'Simran', 'Kaur',   'female', date '1991-08-16', 'Chandigarh', 'Chandigarh',    'Sikh',   'Punjabi',   'LLB',    'Advocate',              167, 'Independent, warm, and family-first.', false),
    ('demo.aditya.nair',  'Aditya', 'Nair',   'male',   date '1988-10-11', 'Bengaluru',  'Karnataka',     'Hindu',  'Malayalam', 'M.Tech', 'Product Manager',       180, 'NRI-friendly, enjoys cooking and long walks.', false)
) as d(
  username, first_name, last_name, gender, dob, city, state,
  religion, mother_tongue, education, occupation, height_cm, about_me, is_verified
)
join public."AMVS_Users" u on u."Username" = d.username
on conflict ("UserId") do update
set
  "FirstName" = excluded."FirstName",
  "LastName" = excluded."LastName",
  "DisplayName" = excluded."DisplayName",
  "Gender" = excluded."Gender",
  "DateOfBirth" = excluded."DateOfBirth",
  "AboutMe" = excluded."AboutMe",
  "City" = excluded."City",
  "State" = excluded."State",
  "Religion" = excluded."Religion",
  "MotherTongue" = excluded."MotherTongue",
  "Education" = excluded."Education",
  "Occupation" = excluded."Occupation",
  "HeightCm" = excluded."HeightCm",
  "ProfileStatus" = 'active',
  "ProfileCompletion" = excluded."ProfileCompletion",
  "IsVerified" = excluded."IsVerified",
  "IsActive" = true,
  "UpdatedAt" = now();
-- Phase 2: profile details (AMVS_ prefix)
-- Contact, physical, education, career, religion, family, lifestyle, preferences

-- Lookups (configurable; labels via i18n in app where needed)
create table if not exists public."AMVS_Religions" (
  "Id" uuid primary key default gen_random_uuid(),
  "Code" text not null unique,
  "Name" text not null,
  "SortOrder" integer not null default 0,
  "IsActive" boolean not null default true
);

create table if not exists public."AMVS_Languages" (
  "Id" uuid primary key default gen_random_uuid(),
  "Code" text not null unique,
  "Name" text not null,
  "SortOrder" integer not null default 0,
  "IsActive" boolean not null default true
);

create table if not exists public."AMVS_Communities" (
  "Id" uuid primary key default gen_random_uuid(),
  "ReligionId" uuid null references public."AMVS_Religions" ("Id") on delete set null,
  "Code" text not null unique,
  "Name" text not null,
  "SortOrder" integer not null default 0,
  "IsActive" boolean not null default true
);

create table if not exists public."AMVS_ContactInformation" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "Phone" text null,
  "AlternatePhone" text null,
  "Email" text null,
  "Country" text null default 'India',
  "State" text null,
  "City" text null,
  "Address" text null,
  "NativeCountry" text null,
  "NativeState" text null,
  "NativeCity" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create table if not exists public."AMVS_PhysicalInformation" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "HeightCm" integer null,
  "WeightKg" numeric(5,2) null,
  "BodyType" text null,
  "Complexion" text null,
  "BloodGroup" text null,
  "Disability" text null,
  "DisabilityDetails" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create table if not exists public."AMVS_Education" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "HighestEducation" text null,
  "Degree" text null,
  "Specialization" text null,
  "Institution" text null,
  "EducationCity" text null,
  "EducationCountry" text null,
  "GraduationYear" integer null,
  "AdditionalQualification" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create table if not exists public."AMVS_Career" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "EmploymentType" text null,
  "Occupation" text null,
  "JobTitle" text null,
  "Company" text null,
  "Industry" text null,
  "WorkLocation" text null,
  "Country" text null,
  "State" text null,
  "City" text null,
  "AnnualIncome" numeric(14,2) null,
  "IncomeCurrency" text null default 'INR',
  "ExperienceYears" numeric(4,1) null,
  "BusinessName" text null,
  "BusinessType" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create table if not exists public."AMVS_ReligionInformation" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "ReligionId" uuid null references public."AMVS_Religions" ("Id") on delete set null,
  "CommunityId" uuid null references public."AMVS_Communities" ("Id") on delete set null,
  "Caste" text null,
  "SubCaste" text null,
  "MotherTongueId" uuid null references public."AMVS_Languages" ("Id") on delete set null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create table if not exists public."AMVS_FamilyInformation" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "FatherName" text null,
  "FatherOccupation" text null,
  "FatherBusiness" text null,
  "FatherEducation" text null,
  "MotherName" text null,
  "MotherOccupation" text null,
  "MotherBusiness" text null,
  "MotherEducation" text null,
  "FamilyType" text null,
  "FamilyValues" text null,
  "FamilyStatus" text null,
  "NativePlace" text null,
  "FamilyLocation" text null,
  "FamilyCity" text null,
  "FamilyState" text null,
  "FamilyBusiness" text null,
  "FamilyBackground" text null,
  "AboutFamily" text null,
  "HasChildren" boolean null,
  "ChildrenCount" integer null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_FamilyInformation_FamilyType_chk"
    check ("FamilyType" is null or "FamilyType" in ('nuclear', 'joint', 'extended')),
  constraint "AMVS_FamilyInformation_FamilyValues_chk"
    check ("FamilyValues" is null or "FamilyValues" in ('traditional', 'moderate', 'liberal')),
  constraint "AMVS_FamilyInformation_FamilyStatus_chk"
    check ("FamilyStatus" is null or "FamilyStatus" in ('middle_class', 'upper_middle_class', 'affluent', 'other'))
);

create table if not exists public."AMVS_Siblings" (
  "Id" uuid primary key default gen_random_uuid(),
  "ProfileId" uuid not null references public."AMVS_Profiles" ("Id") on delete cascade,
  "Name" text null,
  "Gender" text null,
  "DateOfBirth" date null,
  "Occupation" text null,
  "Education" text null,
  "MaritalStatus" text null,
  "Location" text null,
  "Notes" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create index if not exists "AMVS_Siblings_ProfileId_idx"
  on public."AMVS_Siblings" ("ProfileId");

create table if not exists public."AMVS_Children" (
  "Id" uuid primary key default gen_random_uuid(),
  "ProfileId" uuid not null references public."AMVS_Profiles" ("Id") on delete cascade,
  "Name" text null,
  "Gender" text null,
  "DateOfBirth" date null,
  "LivingWith" text null,
  "Education" text null,
  "Occupation" text null,
  "Notes" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create index if not exists "AMVS_Children_ProfileId_idx"
  on public."AMVS_Children" ("ProfileId");

-- Extended family â€” completely optional
create table if not exists public."AMVS_FamilyMembers" (
  "Id" uuid primary key default gen_random_uuid(),
  "ProfileId" uuid not null references public."AMVS_Profiles" ("Id") on delete cascade,
  "RelationshipType" text not null,
  "Name" text null,
  "Gender" text null,
  "Occupation" text null,
  "Location" text null,
  "MaritalStatus" text null,
  "Notes" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint "AMVS_FamilyMembers_RelationshipType_chk" check (
    "RelationshipType" in (
      'maternal_uncle', 'maternal_aunt', 'paternal_uncle', 'paternal_aunt',
      'maternal_grandfather', 'maternal_grandmother',
      'paternal_grandfather', 'paternal_grandmother', 'other'
    )
  )
);

create index if not exists "AMVS_FamilyMembers_ProfileId_idx"
  on public."AMVS_FamilyMembers" ("ProfileId");

create table if not exists public."AMVS_LifestyleInformation" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "Diet" text null,
  "Smoking" text null,
  "Drinking" text null,
  "Exercise" text null,
  "Hobbies" text null,
  "Interests" text null,
  "Pets" text null,
  "Personality" text null,
  "WeekendActivities" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create table if not exists public."AMVS_PartnerPreferences" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" uuid not null unique references public."AMVS_Users" ("Id") on delete cascade,
  "MinAge" integer null,
  "MaxAge" integer null,
  "MinHeightCm" integer null,
  "MaxHeightCm" integer null,
  "PreferredGender" text null,
  "MaritalStatuses" text[] null,
  "EducationPreferences" text null,
  "OccupationPreferences" text null,
  "DietPreferences" text null,
  "SmokingPreferences" text null,
  "DrinkingPreferences" text null,
  "FamilyTypes" text null,
  "FamilyValues" text null,
  "Countries" text null,
  "States" text null,
  "Cities" text null,
  "WillingToRelocate" boolean null,
  "Notes" text null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

-- RLS: service-role only (custom auth)
alter table public."AMVS_Religions" enable row level security;
alter table public."AMVS_Languages" enable row level security;
alter table public."AMVS_Communities" enable row level security;
alter table public."AMVS_ContactInformation" enable row level security;
alter table public."AMVS_PhysicalInformation" enable row level security;
alter table public."AMVS_Education" enable row level security;
alter table public."AMVS_Career" enable row level security;
alter table public."AMVS_ReligionInformation" enable row level security;
alter table public."AMVS_FamilyInformation" enable row level security;
alter table public."AMVS_Siblings" enable row level security;
alter table public."AMVS_Children" enable row level security;
alter table public."AMVS_FamilyMembers" enable row level security;
alter table public."AMVS_LifestyleInformation" enable row level security;
alter table public."AMVS_PartnerPreferences" enable row level security;

revoke all on table public."AMVS_Religions" from anon, authenticated;
revoke all on table public."AMVS_Languages" from anon, authenticated;
revoke all on table public."AMVS_Communities" from anon, authenticated;
revoke all on table public."AMVS_ContactInformation" from anon, authenticated;
revoke all on table public."AMVS_PhysicalInformation" from anon, authenticated;
revoke all on table public."AMVS_Education" from anon, authenticated;
revoke all on table public."AMVS_Career" from anon, authenticated;
revoke all on table public."AMVS_ReligionInformation" from anon, authenticated;
revoke all on table public."AMVS_FamilyInformation" from anon, authenticated;
revoke all on table public."AMVS_Siblings" from anon, authenticated;
revoke all on table public."AMVS_Children" from anon, authenticated;
revoke all on table public."AMVS_FamilyMembers" from anon, authenticated;
revoke all on table public."AMVS_LifestyleInformation" from anon, authenticated;
revoke all on table public."AMVS_PartnerPreferences" from anon, authenticated;

-- UpdatedAt triggers
drop trigger if exists "AMVS_ContactInformation_SetUpdatedAt" on public."AMVS_ContactInformation";
create trigger "AMVS_ContactInformation_SetUpdatedAt"
  before update on public."AMVS_ContactInformation"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_PhysicalInformation_SetUpdatedAt" on public."AMVS_PhysicalInformation";
create trigger "AMVS_PhysicalInformation_SetUpdatedAt"
  before update on public."AMVS_PhysicalInformation"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_Education_SetUpdatedAt" on public."AMVS_Education";
create trigger "AMVS_Education_SetUpdatedAt"
  before update on public."AMVS_Education"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_Career_SetUpdatedAt" on public."AMVS_Career";
create trigger "AMVS_Career_SetUpdatedAt"
  before update on public."AMVS_Career"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_ReligionInformation_SetUpdatedAt" on public."AMVS_ReligionInformation";
create trigger "AMVS_ReligionInformation_SetUpdatedAt"
  before update on public."AMVS_ReligionInformation"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_FamilyInformation_SetUpdatedAt" on public."AMVS_FamilyInformation";
create trigger "AMVS_FamilyInformation_SetUpdatedAt"
  before update on public."AMVS_FamilyInformation"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_LifestyleInformation_SetUpdatedAt" on public."AMVS_LifestyleInformation";
create trigger "AMVS_LifestyleInformation_SetUpdatedAt"
  before update on public."AMVS_LifestyleInformation"
  for each row execute function public."AMVS_SetUpdatedAt"();

drop trigger if exists "AMVS_PartnerPreferences_SetUpdatedAt" on public."AMVS_PartnerPreferences";
create trigger "AMVS_PartnerPreferences_SetUpdatedAt"
  before update on public."AMVS_PartnerPreferences"
  for each row execute function public."AMVS_SetUpdatedAt"();

-- Seed lookups
insert into public."AMVS_Religions" ("Code", "Name", "SortOrder")
values
  ('hindu', 'Hindu', 1),
  ('muslim', 'Muslim', 2),
  ('christian', 'Christian', 3),
  ('sikh', 'Sikh', 4),
  ('jain', 'Jain', 5),
  ('buddhist', 'Buddhist', 6),
  ('parsi', 'Parsi', 7),
  ('jewish', 'Jewish', 8),
  ('other', 'Other', 9),
  ('prefer_not_to_say', 'Prefer not to say', 10)
on conflict ("Code") do update set "Name" = excluded."Name", "IsActive" = true;

insert into public."AMVS_Languages" ("Code", "Name", "SortOrder")
values
  ('gujarati', 'Gujarati', 1),
  ('hindi', 'Hindi', 2),
  ('marathi', 'Marathi', 3),
  ('punjabi', 'Punjabi', 4),
  ('bengali', 'Bengali', 5),
  ('tamil', 'Tamil', 6),
  ('telugu', 'Telugu', 7),
  ('kannada', 'Kannada', 8),
  ('malayalam', 'Malayalam', 9),
  ('odia', 'Odia', 10),
  ('assamese', 'Assamese', 11),
  ('urdu', 'Urdu', 12),
  ('sindhi', 'Sindhi', 13),
  ('konkani', 'Konkani', 14),
  ('nepali', 'Nepali', 15),
  ('english', 'English', 16),
  ('other', 'Other', 17)
on conflict ("Code") do update set "Name" = excluded."Name", "IsActive" = true;
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
-- Phase 6: Matching preference fields
-- Scoring runs in the app (service-role). Horoscope weights stay optional (Phase 8).

alter table public."AMVS_PartnerPreferences"
  add column if not exists "Religions" text null;

alter table public."AMVS_PartnerPreferences"
  add column if not exists "MotherTongues" text null;

alter table public."AMVS_PartnerPreferences"
  add column if not exists "Communities" text null;

comment on column public."AMVS_PartnerPreferences"."Religions" is
  'Optional free-text / comma-separated preferred religions for matching.';
comment on column public."AMVS_PartnerPreferences"."MotherTongues" is
  'Optional free-text / comma-separated preferred mother tongues for matching.';
comment on column public."AMVS_PartnerPreferences"."Communities" is
  'Optional free-text / comma-separated preferred communities for matching.';
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

-- Phase 10: Security hardening for custom-auth architecture
-- Defense in depth: RLS ON + revoke anon/authenticated on every AMVS_ table.
-- App access continues via service_role only (never expose that key to the browser).

do $secure$
declare
  r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'AMVS\_%' escape '\'
  loop
    execute format('alter table public.%I enable row level security', r.table_name);
    execute format(
      'revoke all on table public.%I from anon, authenticated',
      r.table_name
    );
  end loop;
end
$secure$;

-- Diagnostic helper: list AMVS tables and whether RLS is enabled
create or replace view public."AMVS_SecurityTableAudit" as
select
  c.relname as "TableName",
  c.relrowsecurity as "RlsEnabled",
  c.relforcerowsecurity as "RlsForced"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname like 'AMVS\_%' escape '\'
order by c.relname;

revoke all on public."AMVS_SecurityTableAudit" from anon, authenticated;
grant select on public."AMVS_SecurityTableAudit" to service_role;

-- Extra performance indexes for common admin/member paths
create index if not exists "AMVS_Interests_Status_CreatedAt_idx"
  on public."AMVS_Interests" ("Status", "CreatedAt" desc);

create index if not exists "AMVS_Notifications_UserUnread_CreatedAt_idx"
  on public."AMVS_Notifications" ("UserId", "IsRead", "CreatedAt" desc);

create index if not exists "AMVS_Messages_Sender_CreatedAt_idx"
  on public."AMVS_Messages" ("SenderUserId", "CreatedAt" desc);

create index if not exists "AMVS_Profiles_Verified_Active_idx"
  on public."AMVS_Profiles" ("IsVerified", "IsActive", "ProfileStatus");

comment on view public."AMVS_SecurityTableAudit" is
  'Phase 10 security audit: AMVS_ tables should have RLS enabled; client roles revoked.';


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

