-- Game update posters for the public /updates page. Image only, managed by
-- super admins. Images are 1920 × 1080 (16:9), stored as WebP in
-- public-images/updates/.
create table public.game_updates (
  id uuid primary key default gen_random_uuid(),
  image_path text not null check (image_path like 'updates/%.webp'),
  created_at timestamptz not null default now()
);

create index game_updates_created_at_idx on public.game_updates (created_at desc);

alter table public.game_updates enable row level security;

create policy "Anyone reads game updates"
  on public.game_updates for select to anon, authenticated
  using (true);

create policy "Super admins manage game updates"
  on public.game_updates for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));
