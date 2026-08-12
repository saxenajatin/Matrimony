# MAU — Indian Matrimonial Platform

Privacy-first Indian matrimonial web application built with Next.js and Supabase.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase PostgreSQL / Storage / Realtime (API backend)
- **Custom username/password auth** (not Supabase Auth)
- All DB objects prefixed with `AMVS_`
- React Hook Form + Zod
- i18n architecture for English, Gujarati, and Hindi (labels via translation keys)

## Phase status

**Phase 1 — Foundation** (current)

- App scaffold, design system, layouts
- Custom auth: `AMVS_Users`, `AMVS_UserRoles`, `AMVS_Sessions` + AMVS_ RPCs
- Username/password register, login, logout, password reset
- HttpOnly session cookies (server-only service role for auth RPCs)
- Landing, dashboard shell, protected route stubs

Later phases: profiles, photos/privacy, discovery, interests, matching, messaging, horoscope, admin, hardening.

## Getting started

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser-safe)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the client)
- `AUTH_SESSION_SECRET` (long random string)

3. Apply the auth schema in the Supabase SQL Editor:

- Run `scripts/amvs-auth.sql` (or apply `supabase/migrations/*`)

4. Run the app:

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check

## Security notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- Authorization uses DB roles / RLS — not editable `user_metadata`
- Sensitive profile fields are private by default in later schema phases
