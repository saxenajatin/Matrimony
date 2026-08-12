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
