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
