# Sueño — Architecture v2 (summary)

## Product
Social (TikTok/IG) → web landing → $19/mo membership (+ partner bundles $45–120).
Tabs: Learn (short videos), 4 AM Journal (local-first), Bundles (1–2 personalized + catalog).

## Validation (week 0)
Landing page + founding-member pre-sale ($29 / 3 months).
Success bar: 1,000+ visits, ≥3% waitlist, ≥20 pre-sales. Miss it → change message/offer before building.
Campaign links: `https://<site>/?utm_source=tiktok&utm_medium=social&utm_campaign=launch&utm_content=<video-slug>` (`utm_source=instagram` for Instagram).
TODO (`stripe-webhook`): emit PostHog `presale_paid` server event using `session.metadata.distinct_id` + UTMs on `checkout.session.completed` (`kind = 'presale'`).

## Stack
| Layer | Choice |
|---|---|
| Web | Next.js on Vercel (static landing, server routes for Stripe) |
| Mobile | Expo + Expo Router, TanStack Query + MMKV (cache-first), FlashList, expo-image, expo-video |
| Backend | Supabase: Postgres + RLS, Auth (magic link, Apple, Google), Edge Functions, Supavisor pooler |
| Payments | Stripe (web, US). RevenueCat + IAP later for non-US |
| Video | ffmpeg → Cloudflare R2 + custom domain + edge cache; long sleep audio bundled in app |
| Journal | Expo SQLite + SQLCipher, versioned migrations, app lock; local export (v1), E2EE backup (v1.1) |
| Email | Resend as Supabase SMTP |
| Analytics | PostHog (never journal content) |

## Data model
profiles · waitlist · presales · subscriptions · stripe_events · trigger_tags · tag_events · bundles · bundle_tag_weights · recommendations.
See supabase/migrations/20261124000000_init.sql.

## Build order
0. Landing + pre-sale (this week)
1. Foundation: schema, auth, Stripe subscription + webhook, membership gate (weeks 1–3)
2. 4 AM Journal (weeks 3–5)
3. Learn tab on R2, 10–15 videos (weeks 5–6)
4. Bundles via partner links (weeks 6–7)
5. TestFlight beta → US App Store (weeks 7–9)

## Not yet
RevenueCat/IAP, E2EE backup, full web app, pgvector, self-hosted OTA (~50k MAU), read replicas, own fulfillment.

## Speed targets
Cold start <2s (mid Android) · journal open <300ms · first video frame <1s · landing LCP <2.5s.

## Client content reads (v1)
- Web, iOS, and Android read `pillars`, `trigger_tags`, `videos`, `video_tags`, `partners`, `products`, `bundles`, `bundle_items`, and `recommendations` directly via Supabase anon key + user session; RLS returns only published rows (and `members` videos only when `is_member()`).
- Media URLs = `NEXT_PUBLIC_MEDIA_BASE_URL` + R2 key; show `*_es` fields when device language is Spanish, else English.
- Mobile caches with TanStack Query (persisted) and refreshes in the background; bundle/product taps insert into `outbound_clicks` then open the partner URL.
