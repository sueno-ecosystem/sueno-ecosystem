-- Trigger functions: never callable directly
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.tag_events_after_insert() from public, anon, authenticated;

-- is_member(): signed-in users only
revoke execute on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- Index foreign keys
create index if not exists bundle_tag_weights_tag_slug_idx on public.bundle_tag_weights (tag_slug);
create index if not exists presales_claimed_by_idx      on public.presales (claimed_by);
create index if not exists recommendations_bundle_id_idx on public.recommendations (bundle_id);
create index if not exists tag_events_tag_slug_idx      on public.tag_events (tag_slug);
