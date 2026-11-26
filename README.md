# Galene

Calm nights. Whole days. Sleep recovery platform: Learn (short videos) · The 4am Journal (local-first, private) · Curated Bundles.

## Structure
```
apps/web        Next.js – landing, checkout, account
apps/mobile     Expo – iOS + Android app
packages/shared Shared types, tags, membership helpers
packages/config Shared tsconfig
supabase/       Migrations, seed, edge functions
scripts/        Video encoding (ffmpeg → R2)
docs/           spec.md, decisions.md
```

## Getting started
```bash
corepack enable          # gives you pnpm
pnpm install
cp .env.example apps/web/.env.local   # fill in values
pnpm dev:web             # http://localhost:3000
pnpm dev:mobile          # Expo
```

Read `AGENTS.md` and `docs/decisions.md` before changing architecture.
