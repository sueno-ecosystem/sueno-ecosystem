-- 0001 init — NOT applied yet. Review before running.
-- Week 0 only needs: waitlist, presales. The rest is ready for week 1.

-- ========== PROFILES ==========
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone text,
  tags_sync_consent boolean not null default false,
  tags_sync_consent_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- ========== WEEK 0: WAITLIST + PRESALES ==========
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  utm jsonb,
  created_at timestamptz not null default now()
);

create table public.presales (
  stripe_session_id text primary key,
  email text not null,
  amount_cents int not null,
  utm jsonb,
  claimed_by uuid references auth.users on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index presales_email_idx on public.presales (lower(email));

-- ========== SUBSCRIPTIONS (single source of truth) ==========
create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  provider text not null check (provider in ('stripe','apple','google','presale')),
  status text not null check (status in ('active','trialing','past_due','canceled','incomplete','unpaid')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  provider_customer_id text,
  provider_subscription_id text unique,
  price_id text,
  updated_at timestamptz not null default now()
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = (select auth.uid())
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- ========== TAGS, BUNDLES, RECOMMENDATIONS ==========
create table public.trigger_tags (
  slug text primary key,
  label text not null,
  pillar text not null check (pillar in ('environment','medications','clothes','wearables','knowledge','mind'))
);

create table public.tag_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  tag_slug text not null references public.trigger_tags,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index tag_events_user_time_idx on public.tag_events (user_id, occurred_at desc);

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  price_cents int,
  partner_name text,
  partner_url text,
  image_url text,
  active boolean not null default true,
  sort int not null default 0
);

create table public.bundle_tag_weights (
  bundle_id uuid references public.bundles on delete cascade,
  tag_slug text references public.trigger_tags on delete cascade,
  weight int not null default 1,
  primary key (bundle_id, tag_slug)
);

create table public.recommendations (
  user_id uuid references auth.users on delete cascade,
  bundle_id uuid references public.bundles on delete cascade,
  score int not null,
  computed_at timestamptz not null default now(),
  primary key (user_id, bundle_id)
);

create function public.recompute_recommendations(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.recommendations where user_id = p_user;
  insert into public.recommendations (user_id, bundle_id, score)
  select p_user, w.bundle_id, sum(w.weight)::int
  from public.tag_events e
  join public.bundle_tag_weights w on w.tag_slug = e.tag_slug
  join public.bundles b on b.id = w.bundle_id and b.active
  where e.user_id = p_user and e.occurred_at > now() - interval '30 days'
  group by w.bundle_id
  order by sum(w.weight) desc
  limit 2;
end $$;
revoke execute on function public.recompute_recommendations(uuid) from public, anon, authenticated;

create function public.tag_events_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.recompute_recommendations(new.user_id);
  return new;
end $$;

create trigger tag_events_recompute
after insert on public.tag_events for each row execute function public.tag_events_after_insert();

-- ========== ROW LEVEL SECURITY ==========
alter table public.profiles enable row level security;
alter table public.waitlist enable row level security;        -- service role only
alter table public.presales enable row level security;        -- service role only
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;   -- service role only
alter table public.trigger_tags enable row level security;
alter table public.tag_events enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_tag_weights enable row level security;
alter table public.recommendations enable row level security;

create policy "own profile read"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = id);

create policy "own subscription read" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);

create policy "tags readable" on public.trigger_tags for select to authenticated using (true);

create policy "own tag events read"   on public.tag_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "own tag events delete" on public.tag_events for delete to authenticated using ((select auth.uid()) = user_id);
create policy "insert tags only with consent" on public.tag_events for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.tags_sync_consent)
  );

create policy "active bundles readable" on public.bundles for select to authenticated using (active);
create policy "weights readable" on public.bundle_tag_weights for select to authenticated using (true);
create policy "own recommendations read" on public.recommendations for select to authenticated using ((select auth.uid()) = user_id);
