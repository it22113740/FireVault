create table public.id_college_samples (
  slot integer primary key check (slot between 1 and 3),
  image_path text not null check (image_path like 'id-college/%.webp'),
  price numeric(12,2) not null check (price > 0)
);
alter table public.id_college_samples enable row level security;
create policy "Anyone reads ID College samples"
  on public.id_college_samples for select to anon, authenticated using (true);
create policy "Super admins manage ID College samples"
  on public.id_college_samples for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));
