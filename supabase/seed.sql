-- Keep in sync with packages/shared/src/tags.ts
insert into public.trigger_tags (slug, label, pillar) values
  ('racing_thoughts','Racing thoughts','mind'),
  ('work_worry','Worried about work','mind'),
  ('too_hot','Too hot','environment'),
  ('noise','Noise','environment'),
  ('light','Light in the room','environment'),
  ('late_caffeine','Caffeine late','knowledge'),
  ('late_screen','Screens before bed','knowledge'),
  ('alcohol','Alcohol','knowledge'),
  ('uncomfortable_sleepwear','Uncomfortable sleepwear','clothes'),
  ('tracker_anxiety','Checking my sleep tracker','wearables'),
  ('med_change','Medication change','medications')
on conflict (slug) do nothing;
