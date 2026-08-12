# Phase 10 — Testing & Security checklist

## Database (Supabase SQL Editor)

1. Run `scripts/amvs-phase10-security.sql` (also appended to `scripts/SETUP_ALL.sql`).
2. Run diagnostics in `scripts/phase10-security-audit.sql`.
3. Expect: every `AMVS_%` table has `RlsEnabled = true`.
4. Expect: no `anon` / `authenticated` grants on `AMVS_%` tables.
5. App continues to work via **service role** only (custom auth). Do not put the service role key in `NEXT_PUBLIC_*`.

## App hardening (shipped)

- Security headers in `next.config.ts` (`X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy).
- `poweredByHeader: false`.
- Auth rate limits on login / register / password reset.
- `assertServiceRoleNotPublic()` on admin client boot.
- Skip-to-content + landmark/`aria-current` polish on member and admin shells.

## Tests

```bash
npm run test
npm run typecheck
npm run build
# with `npm run dev` running (set port if not 3000):
npm run smoke
# SMOKE_BASE_URL=http://localhost:3001 npm run smoke
```

## Manual QA

- [ ] Mobile: bottom nav usable; Discover/filters scroll cleanly
- [ ] Keyboard: Tab reaches skip link, then primary content
- [ ] Non-admin cannot open `/admin` (redirects)
- [ ] Suspended / inactive user cannot log in
- [ ] Discover excludes blocked profiles; chat requires accepted interest
