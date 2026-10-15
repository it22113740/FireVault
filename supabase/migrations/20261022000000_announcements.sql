-- Homepage announcement banners, managed exclusively by super admins.
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  image_path text not null check (image_path like 'announcements/%.webp'),
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "Published announcements are public"
  on public.announcements for select to anon, authenticated
  using (published);
create policy "Super admins manage announcements"
  on public.announcements for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));
grant select on public.announcements to anon;
grant select, insert, update, delete on public.announcements to authenticated;
