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
