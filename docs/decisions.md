# Decisions log

One line per decision: date — decision — why.

- 2026-11-24 — Monorepo (pnpm + Turborepo) with apps/web, apps/mobile, packages/shared — one place for all code and shared types.
- 2026-11-24 — Supabase for DB/auth/functions — Postgres + RLS + auth in one, fits budget.
- 2026-11-24 — Membership lives in `subscriptions` table, written only by the Stripe webhook — a boolean flag never revokes on cancel/refund; user_metadata is user-editable.
- 2026-11-24 — Login required before checkout; Stripe `client_reference_id = user.id` — avoids Sign in with Apple private-relay email mismatches.
- 2026-11-24 — Video on Cloudflare R2, self-encoded with ffmpeg — Stream's per-minute billing ≈ $3k/mo at target usage vs ≈ $0–20 on R2.
- 2026-11-24 — Journal stays on device (SQLite + SQLCipher); v1 ships local export, encrypted backup in v1.1 — privacy promise, but data-loss risk must be communicated.
- 2026-11-24 — Simple tag-weight scoring instead of pgvector — ~100 bundles, 11 tags; vectors are overkill.
- 2026-11-24 — Web = landing + checkout + account only — local journal on web is unreliable.
- 2026-11-24 — US App Store only at launch, Stripe web checkout; IAP (RevenueCat) when expanding — non-US storefronts require IAP.
- 2026-11-24 — Bundles start as partner/affiliate links — avoid inventory, shipping, returns, sales tax.
- 2026-11-24 — Medications pillar is education only — Apple 1.4.1/1.4.2 and clinical liability.
- 2026-11-24 — Week 0 = landing page + founding-member pre-sale before building the app — validate willingness to pay.
- 2026-11-24 — Landing page v1: hook "Awake at 4 AM again?", founding member $29 for first 3 months then $19/mo, full refund before launch — draft copy, test hooks via UTM-tagged videos.
