-- 1) Missing FK indexes
create index if not exists trigger_tags_pillar_idx on public.trigger_tags (pillar);
create index if not exists videos_created_by_idx  on public.videos (created_by);
create index if not exists videos_reviewed_by_idx on public.videos (reviewed_by);

-- 2) Split "for all" write policies into insert/update/delete (so they no longer overlap SELECT)
do $$
declare r record;
begin
  for r in select * from (values
    ('videos',             'editors manage videos',        'public.can_edit()'),
    ('products',           'editors manage products',      'public.can_edit()'),
    ('bundles',            'editors manage bundles',       'public.can_edit()'),
    ('partners',           'editors manage partners',      'public.can_edit()'),
    ('pillars',            'editors manage pillars',       'public.can_edit()'),
    ('trigger_tags',       'editors manage tags',          'public.can_edit()'),
    ('video_tags',         'editors manage video tags',    'public.can_edit()'),
    ('bundle_items',       'editors manage bundle items',  'public.can_edit()'),
    ('bundle_tag_weights', 'editors manage weights',       'public.can_edit()'),
    ('admins',             'owners manage admins',         'public.admin_role() = ''owner''')
  ) as t(tbl, pol, cond)
  loop
    execute format('drop policy %I on public.%I', r.pol, r.tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
                   r.pol || ' (insert)', r.tbl, r.cond);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
                   r.pol || ' (update)', r.tbl, r.cond, r.cond);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)',
                   r.pol || ' (delete)', r.tbl, r.cond);
  end loop;
end $$;

-- 3) One SELECT policy per role on tables that had two
drop policy "published videos for members" on public.videos;
drop policy "admins read videos" on public.videos;
create policy "videos readable" on public.videos for select to authenticated
  using ((status = 'published' and (access = 'free' or public.is_member())) or public.is_admin());

drop policy "published products readable" on public.products;
drop policy "admins read products" on public.products;
create policy "products readable (public)" on public.products for select to anon using (status = 'published');
create policy "products readable" on public.products for select to authenticated
  using (status = 'published' or public.is_admin());

drop policy "published bundles readable" on public.bundles;
drop policy "admins read bundles" on public.bundles;
create policy "bundles readable (public)" on public.bundles for select to anon using (status = 'published');
create policy "bundles readable" on public.bundles for select to authenticated
  using (status = 'published' or public.is_admin());

drop policy "active partners readable" on public.partners;
drop policy "admins read partners" on public.partners;
create policy "partners readable (public)" on public.partners for select to anon using (status = 'active');
create policy "partners readable" on public.partners for select to authenticated
  using (status = 'active' or public.is_admin());
