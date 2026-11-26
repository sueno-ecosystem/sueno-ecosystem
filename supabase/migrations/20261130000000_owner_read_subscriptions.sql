create policy "owners read subscriptions" on public.subscriptions
  for select to authenticated using (public.admin_role() = 'owner');

create policy "owners read stripe_events" on public.stripe_events
  for select to authenticated using (public.admin_role() = 'owner');

create or replace function public.log_stripe_product_audit(
  p_row_id text,
  p_old jsonb,
  p_new jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.admin_role(), '') <> 'owner' then
    raise exception 'Not allowed';
  end if;
  insert into public.audit_log (table_name, row_id, action, actor, old_data, new_data)
  values ('stripe_product', p_row_id, 'UPDATE', (select auth.uid()), p_old, p_new);
end $$;

revoke execute on function public.log_stripe_product_audit(text, jsonb, jsonb) from public, anon;
grant execute on function public.log_stripe_product_audit(text, jsonb, jsonb) to authenticated;
