-- Demo seed for reviewing Partners & Products in apps/admin (all DRAFT, no images).
-- Clean up with:
--   delete from public.products where name like 'DEMO –%'; delete from public.partners where name like 'DEMO –%';

with p1 as (
  insert into public.partners (name, website, status)
  values ('DEMO – CoolRest Labs', 'https://example.com/coolrest', 'prospect')
  on conflict (name) do update set website = excluded.website
  returning id
),
p2 as (
  insert into public.partners (name, website, status)
  values ('DEMO – QuietRoom Audio', 'https://example.com/quietroom', 'prospect')
  on conflict (name) do update set website = excluded.website
  returning id
)
insert into public.products (partner_id, slug, name, description, pillar, price_cents, status, claims_reviewed, sort)
values
  ((select id from p1), 'demo-cooling-bamboo-sheet-set', 'DEMO – Cooling Bamboo Sheet Set', 'Breathable viscose sheets for warm sleepers.', 'environment', 8900, 'draft', false, 1),
  ((select id from p1), 'demo-merino-sleep-tee', 'DEMO – Merino Sleep Tee', 'Lightweight temperature-regulating sleep shirt.', 'clothes', 5800, 'draft', false, 2),
  ((select id from p2), 'demo-brown-noise-bedside-speaker', 'DEMO – Brown Noise Bedside Speaker', 'Non-looping analog-style brown noise machine.', 'environment', 6400, 'draft', false, 3),
  ((select id from p2), 'demo-amber-reading-clip-light', 'DEMO – Amber Reading Clip Light', 'Zero-blue-light 1800K bedside clip lamp.', 'environment', 2900, 'draft', false, 4)
on conflict (slug) do nothing;
