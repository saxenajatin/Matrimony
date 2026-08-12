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

-- Extended family — completely optional
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
