-- Phase 1: required PostgreSQL extensions (AMVS platform)
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
