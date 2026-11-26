create policy "admins read waitlist" on public.waitlist
  for select to authenticated using (public.is_admin());
create policy "owners read presales" on public.presales
  for select to authenticated using (public.admin_role() = 'owner');
