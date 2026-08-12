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
