# Phase 11 — 100k performance

## Run in Supabase SQL Editor
`scripts/amvs-phase11-performance.sql`

## What it does
- Discover age filters use **DateOfBirth ranges** (index-friendly)
- Indexes for Discover sort, DOB, country, height, approved photos, messages
- Optional `pg_trgm` indexes for name/city search
- `AMVS_ListConversationsForUser` — inbox without N+1

## App-side (already shipped)
- Batch privacy + primary photo enrichment (Discover / Matches)
- Privacy upsert-on-read removed (select first)
- Interests / shortlist capped (50–100) + count helpers
- Dashboard uses SQL counts (not full list loads)
- Discover exact COUNT only on pages 1–5

## Verify
```bash
npm run typecheck
```
Then exercise Discover filters, Messages inbox, Dashboard metrics.
