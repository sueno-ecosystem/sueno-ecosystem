-- ========== HELPERS ==========
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ========== ADMINS & ROLES ==========
create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('owner','editor','reviewer')),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create function public.admin_role() returns text
language sql stable security definer set search_path = '' as $$
  select a.role from public.admins a where a.user_id = (select auth.uid());
$$;
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
create function public.can_edit() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a
                 where a.user_id = (select auth.uid()) and a.role in ('owner','editor'));
$$;
revoke execute on function public.admin_role(), public.is_admin(), public.can_edit() from public, anon;
grant execute on function public.admin_role(), public.is_admin(), public.can_edit() to authenticated;

create policy "admins visible to admins" on public.admins
  for select to authenticated using (public.is_admin());
create policy "owners manage admins" on public.admins
  for all to authenticated using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- ========== PILLARS ==========
create table public.pillars (
  slug text primary key,
  title text not null,
  title_es text,
  description text,
  description_es text,
  icon text,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.pillars (slug, title, sort) values
  ('environment','Environment',1), ('medications','Medications & Tapering',2),
  ('clothes','Clothes',3), ('wearables','Wearables',4),
  ('knowledge','Knowledge',5), ('mind','Mind',6);
alter table public.pillars enable row level security;
create policy "pillars readable" on public.pillars for select to anon, authenticated using (true);
create policy "editors manage pillars" on public.pillars
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- trigger_tags now points to pillars
alter table public.trigger_tags drop constraint if exists trigger_tags_pillar_check;
alter table public.trigger_tags
  add constraint trigger_tags_pillar_fk foreign key (pillar) references public.pillars(slug) on update cascade,
  add column label_es text,
  add column sort int not null default 0,
  add column active boolean not null default true;
create policy "editors manage tags" on public.trigger_tags
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- ========== VIDEOS ==========
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  title_es text,
  summary text,
  summary_es text,
  pillar text not null references public.pillars(slug) on update cascade,
  duration_seconds int check (duration_seconds > 0),
  video_key text,
  poster_key text,
  captions_key text,
  captions_es_key text,
  access text not null default 'members' check (access in ('free','members')),
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  needs_medical_review boolean not null default false,
  reviewed_by uuid references auth.users on delete set null,
  reviewed_at timestamptz,
  sort int not null default 0,
  published_at timestamptz,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint videos_publish_ready check (status <> 'published' or (video_key is not null and poster_key is not null)),
  constraint videos_medical_ok check (status <> 'published' or not needs_medical_review or reviewed_at is not null)
);
create index videos_pillar_status_idx on public.videos (pillar, status, sort);

create function public.videos_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare trusted boolean := (select auth.uid()) is null              -- server / SQL editor
                           or coalesce(public.admin_role(), '') in ('owner','reviewer');
begin
  if new.pillar = 'medications' then new.needs_medical_review := true; end if;

  if tg_op = 'INSERT' then
    if (new.reviewed_at is not null or new.reviewed_by is not null) and not trusted then
      raise exception 'Only owners or reviewers can approve medical content';
    end if;
  else
    if (new.reviewed_at is distinct from old.reviewed_at or new.reviewed_by is distinct from old.reviewed_by)
       and not trusted then
      raise exception 'Only owners or reviewers can approve medical content';
    end if;
    -- editing reviewed content clears the approval
    if old.reviewed_at is not null
       and new.reviewed_at is not distinct from old.reviewed_at
       and (new.title, new.summary, new.title_es, new.summary_es, new.video_key, new.captions_key, new.captions_es_key)
           is distinct from
           (old.title, old.summary, old.title_es, old.summary_es, old.video_key, old.captions_key, old.captions_es_key) then
      new.reviewed_at := null;
      new.reviewed_by := null;
      if new.needs_medical_review and new.status = 'published' then new.status := 'review'; end if;
    end if;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.videos_before_write() from public, anon, authenticated;
create trigger videos_before_write before insert or update on public.videos
  for each row execute function public.videos_before_write();

create function public.approve_video(p_video uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.admin_role(), '') not in ('owner','reviewer') then
    raise exception 'Not allowed';
  end if;
  update public.videos set reviewed_at = now(), reviewed_by = (select auth.uid()) where id = p_video;
end $$;
revoke execute on function public.approve_video(uuid) from public, anon;
grant execute on function public.approve_video(uuid) to authenticated;

alter table public.videos enable row level security;
create policy "free published videos (public)" on public.videos
  for select to anon using (status = 'published' and access = 'free');
create policy "published videos for members" on public.videos
  for select to authenticated using (status = 'published' and (access = 'free' or public.is_member()));
create policy "admins read videos" on public.videos
  for select to authenticated using (public.is_admin());
create policy "editors manage videos" on public.videos
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

create table public.video_tags (
  video_id uuid references public.videos on delete cascade,
  tag_slug text references public.trigger_tags on delete cascade,
  primary key (video_id, tag_slug)
);
create index video_tags_tag_idx on public.video_tags (tag_slug);
alter table public.video_tags enable row level security;
create policy "video tags readable" on public.video_tags for select to anon, authenticated using (true);
create policy "editors manage video tags" on public.video_tags
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- ========== PARTNERS (public part + private deal terms) ==========
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website text,
  logo_key text,
  status text not null default 'prospect' check (status in ('prospect','active','paused','ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.partners enable row level security;
create policy "active partners readable" on public.partners
  for select to anon, authenticated using (status = 'active');
create policy "admins read partners" on public.partners for select to authenticated using (public.is_admin());
create policy "editors manage partners" on public.partners
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

create table public.partner_deals (
  partner_id uuid primary key references public.partners on delete cascade,
  contact_name text,
  contact_email text,
  commission_type text not null default 'percent' check (commission_type in ('percent','flat','none')),
  commission_value numeric(10,2),
  affiliate_network text,
  affiliate_base_url text,
  contract_url text,
  notes text,
  updated_at timestamptz not null default now()
);
alter table public.partner_deals enable row level security;
create policy "editors manage deals" on public.partner_deals
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- ========== PRODUCTS ==========
create table public.products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners on delete restrict,
  slug text not null unique,
  name text not null,
  name_es text,
  description text,
  description_es text,
  pillar text references public.pillars(slug) on update cascade,
  image_key text,
  price_cents int check (price_cents >= 0),
  currency text not null default 'usd',
  url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  claims_reviewed boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_publish_ready check (status <> 'published' or (url is not null and image_key is not null and claims_reviewed))
);
create index products_partner_idx on public.products (partner_id);
create index products_pillar_idx on public.products (pillar, status, sort);
alter table public.products enable row level security;
create policy "published products readable" on public.products
  for select to anon, authenticated using (status = 'published');
create policy "admins read products" on public.products for select to authenticated using (public.is_admin());
create policy "editors manage products" on public.products
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- ========== BUNDLES (upgrade existing table; it is empty) ==========
drop policy "active bundles readable" on public.bundles;
alter table public.bundles
  drop column active,
  drop column partner_name,
  drop column image_url,
  add column title_es text,
  add column description_es text,
  add column pillar text references public.pillars(slug) on update cascade,
  add column status text not null default 'draft' check (status in ('draft','published','archived')),
  add column hero_image_key text,
  add column discount_code text,
  add column claims_reviewed boolean not null default false,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();
alter table public.bundles rename column partner_url to url;
alter table public.bundles add constraint bundles_publish_ready
  check (status <> 'published' or (hero_image_key is not null and claims_reviewed));
create index bundles_pillar_idx on public.bundles (pillar, status, sort);

create policy "published bundles readable" on public.bundles
  for select to anon, authenticated using (status = 'published');
create policy "admins read bundles" on public.bundles for select to authenticated using (public.is_admin());
create policy "editors manage bundles" on public.bundles
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

create table public.bundle_items (
  bundle_id uuid references public.bundles on delete cascade,
  product_id uuid references public.products on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  sort int not null default 0,
  primary key (bundle_id, product_id)
);
create index bundle_items_product_idx on public.bundle_items (product_id);
alter table public.bundle_items enable row level security;
create policy "bundle items readable" on public.bundle_items for select to anon, authenticated using (true);
create policy "editors manage bundle items" on public.bundle_items
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

create policy "editors manage weights" on public.bundle_tag_weights
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- recommendations now use published bundles
create or replace function public.recompute_recommendations(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.recommendations where user_id = p_user;
  insert into public.recommendations (user_id, bundle_id, score)
  select p_user, w.bundle_id, sum(w.weight)::int
  from public.tag_events e
  join public.bundle_tag_weights w on w.tag_slug = e.tag_slug
  join public.bundles b on b.id = w.bundle_id and b.status = 'published'
  where e.user_id = p_user and e.occurred_at > now() - interval '30 days'
  group by w.bundle_id
  order by sum(w.weight) desc
  limit 2;
end $$;
revoke execute on function public.recompute_recommendations(uuid) from public, anon, authenticated;

-- ========== OUTBOUND CLICKS (affiliate proof) ==========
create table public.outbound_clicks (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users on delete set null,
  product_id uuid references public.products on delete set null,
  bundle_id uuid references public.bundles on delete set null,
  source text not null check (source in ('recommendation','catalog','web')),
  platform text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now(),
  constraint outbound_clicks_target check (product_id is not null or bundle_id is not null)
);
create index outbound_clicks_time_idx on public.outbound_clicks (created_at desc);
create index outbound_clicks_product_idx on public.outbound_clicks (product_id);
create index outbound_clicks_bundle_idx on public.outbound_clicks (bundle_id);
create index outbound_clicks_user_idx on public.outbound_clicks (user_id);
alter table public.outbound_clicks enable row level security;
create policy "members log own clicks" on public.outbound_clicks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "admins read clicks" on public.outbound_clicks
  for select to authenticated using (public.is_admin());

-- ========== AUDIT LOG ==========
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text,
  action text not null,
  actor uuid,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);
create index audit_log_row_idx on public.audit_log (table_name, row_id, changed_at desc);
alter table public.audit_log enable row level security;
create policy "admins read audit" on public.audit_log for select to authenticated using (public.is_admin());

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (table_name, row_id, action, actor, old_data, new_data)
  values (tg_table_name,
          coalesce(r->>'id', r->>'slug', r->>'user_id', r->>'partner_id', r->>'bundle_id', r->>'video_id'),
          tg_op, (select auth.uid()),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;
revoke execute on function public.audit_row() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['pillars','trigger_tags','videos','video_tags','partners','partner_deals',
                           'products','bundles','bundle_items','bundle_tag_weights','admins'] loop
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
  foreach t in array array['pillars','partners','partner_deals','products','bundles'] loop
    execute format('create trigger %I before update on public.%I
                    for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;
