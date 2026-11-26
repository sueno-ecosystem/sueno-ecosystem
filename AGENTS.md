# Project rules for AI agents (Antigravity, Claude, etc.)

Product: **Galene**. Read `docs/brand/brand.md` before any UI or copy work.
Brand architecture: Galene (parent) · Diario de las 4am (community/content, the app's entry; EN: The 4am Journal) · Galene Atelier (own products made in Colombia) · La Selección (multibrand store).
Each app also has its own AGENTS.md (Next.js / Expo). Read both.

## Stack (do not change without updating docs/decisions.md)
- Monorepo: pnpm + Turborepo. TypeScript strict everywhere.
- apps/web: Next.js (App Router) on Vercel. Landing, checkout, account only. No journal on web.
- apps/mobile: Expo + Expo Router. Dark theme everywhere (no white flash).
- packages/shared: shared types, tag list, membership helpers.
- Backend: Supabase (Postgres + RLS + Auth + Edge Functions). Migrations in supabase/migrations.
- Payments: Stripe. Video: Cloudflare R2 (NOT Cloudflare Stream). Email: Resend.

## Hard rules
1. Journal text NEVER leaves the device. No journal table, no logging/analytics of journal input.
2. Membership changes ONLY through the stripe-webhook function writing `subscriptions`.
   Never store membership in user_metadata.
3. Every table has RLS enabled. New tables need policies in the same migration.
4. Never edit an applied migration. Add a new timestamped one.
5. Tag sync requires `profiles.tags_sync_consent = true`.
6. iOS app shows no prices, purchase buttons, or website links until decided in docs/decisions.md.
7. Secrets only via environment variables. Never commit .env files.
8. Medications content is educational only. No dosages or taper schedules.
9. Subscription checkout always requires a logged-in user; pass `client_reference_id = user.id` to Stripe.
   Exception: the week-0 founding-member pre-sale (no login); buyers claim later via a magic link to the purchase email, never via Sign in with Apple.

## Conventions
- Install with pnpm only. Run `pnpm typecheck && pnpm lint` before committing.
- Regenerate DB types with `pnpm db:types` after any migration.
- Admin writes, apps read published only; files in R2; never service role in client code.
- New migration version numbers must be greater than the latest existing one (e.g. `20261130000000`, `20261201000000`, or `supabase migration new` only if its timestamp is already higher).
- Small PRs into main. Conventional commits (feat:, fix:, chore:, docs:).
