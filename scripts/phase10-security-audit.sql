-- Run in Supabase SQL Editor after Phase 10 migration.
-- Expect: every AMVS_ table has RlsEnabled = true.

select *
from public."AMVS_SecurityTableAudit"
order by "TableName";

-- Expect: no privileges for anon/authenticated on AMVS_ tables
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like 'AMVS\_%' escape '\'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
