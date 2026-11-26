alter table public.presales
  add column if not exists refunded_at timestamptz,
  add column if not exists stripe_payment_intent_id text;

create index if not exists presales_payment_intent_idx on public.presales (stripe_payment_intent_id);
