-- Seller shop profiles, customer feedback on sellers, and the public views
-- that show them.

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

-- Customers sign up themselves (profile row created by the sign-up action
-- with the service role). is_active = false blocks them.
create function public.is_active_customer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'customer' and is_active
  );
$$;

revoke execute on function public.is_active_customer() from public;
grant execute on function public.is_active_customer() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seller shop profiles (one per sales admin, created during onboarding)
-- ---------------------------------------------------------------------------

create table public.seller_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  -- Shareable address: /sellers/<slug>
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  description text not null default '' check (char_length(description) <= 2000),
  logo_path text not null default '',             -- public-images/sellers/
  cover_path text not null default '',
  -- https only, so a stored link can never be javascript: or similar
  whatsapp_group_url text check (whatsapp_group_url ~ '^https://'),
  tiktok_url text check (tiktok_url ~ '^https://'),
  facebook_url text check (facebook_url ~ '^https://'),
  -- Set by the seller themselves
  total_sold int not null default 0 check (total_sold between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger seller_profiles_set_updated_at
  before update on public.seller_profiles
  for each row execute function public.set_updated_at();

alter table public.seller_profiles enable row level security;

create policy "Anyone reads seller profiles"
  on public.seller_profiles for select to anon, authenticated
  using (true);

create policy "Sales admins create own seller profile"
  on public.seller_profiles for insert to authenticated
  with check (id = (select auth.uid()) and (select public.is_active_sales_admin()));

create policy "Sales admins update own seller profile"
  on public.seller_profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.is_active_sales_admin()))
  with check (id = (select auth.uid()) and (select public.is_active_sales_admin()));

create policy "Super admins manage seller profiles"
  on public.seller_profiles for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Customer feedback: one row per customer per seller, holding a like or
-- dislike, a 1–5 rating and/or a written review
-- ---------------------------------------------------------------------------

create type public.reaction as enum ('like', 'dislike');

create table public.seller_feedback (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  -- Copied from the customer's profile by the trigger below (profiles are
  -- private, reviews are public)
  reviewer_name text not null default '',
  reaction public.reaction,
  rating smallint check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, customer_id),
  constraint seller_feedback_not_empty check (
    reaction is not null or rating is not null or nullif(btrim(comment), '') is not null
  )
);

create index seller_feedback_seller_idx on public.seller_feedback (seller_id, updated_at desc);

create trigger seller_feedback_set_updated_at
  before update on public.seller_feedback
  for each row execute function public.set_updated_at();

-- Customers can only write feedback as themselves, under their own name
create function public.guard_seller_feedback()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'service_role' or public.is_super_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.seller_id := old.seller_id;
    new.created_at := old.created_at;
  end if;
  new.customer_id := (select auth.uid());
  new.reviewer_name := coalesce(
    (select full_name from public.profiles where id = (select auth.uid())),
    'Customer'
  );
  return new;
end;
$$;

create trigger seller_feedback_guard
  before insert or update on public.seller_feedback
  for each row execute function public.guard_seller_feedback();

alter table public.seller_feedback enable row level security;

create policy "Anyone reads seller feedback"
  on public.seller_feedback for select to anon, authenticated
  using (true);

create policy "Customers write own feedback"
  on public.seller_feedback for insert to authenticated
  with check (customer_id = (select auth.uid()) and (select public.is_active_customer()));

create policy "Customers update own feedback"
  on public.seller_feedback for update to authenticated
  using (customer_id = (select auth.uid()) and (select public.is_active_customer()))
  with check (customer_id = (select auth.uid()) and (select public.is_active_customer()));

create policy "Customers delete own feedback"
  on public.seller_feedback for delete to authenticated
  using (customer_id = (select auth.uid()) and (select public.is_active_customer()));

create policy "Super admins manage feedback"
  on public.seller_feedback for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Public views
-- ---------------------------------------------------------------------------

-- Seller directory with feedback totals and live listing counts. Invoker
-- rights: everything it reads is already public under RLS (and listings
-- counts only include published rows for anon).
create view public.seller_directory
with (security_invoker = true)
as
select
  sp.id,
  sp.display_name,
  sp.slug,
  sp.description,
  sp.logo_path,
  sp.cover_path,
  sp.whatsapp_group_url,
  sp.tiktok_url,
  sp.facebook_url,
  sp.total_sold,
  sp.created_at,
  coalesce(f.likes, 0) as likes,
  coalesce(f.dislikes, 0) as dislikes,
  f.rating_avg,
  coalesce(f.rating_count, 0) as rating_count,
  coalesce(f.review_count, 0) as review_count,
  coalesce(l.live_listings, 0) as live_listings
from public.seller_profiles sp
left join (
  select
    seller_id,
    count(*) filter (where reaction = 'like') as likes,
    count(*) filter (where reaction = 'dislike') as dislikes,
    round(avg(rating), 2) as rating_avg,
    count(rating) as rating_count,
    count(*) filter (where nullif(btrim(comment), '') is not null) as review_count
  from public.seller_feedback
  group by seller_id
) f on f.seller_id = sp.id
left join (
  select created_by, count(*) as live_listings
  from public.listings
  where publish_status = 'published'
  group by created_by
) l on l.created_by = sp.id;

grant select on public.seller_directory to anon, authenticated;

-- Listings now also carry their seller's shop (null for the super admin's
-- own listings, which have no shop). New columns go at the end.
create or replace view public.published_listings
with (security_invoker = false)
as
select
  l.id,
  l.title,
  l.description,
  l.price,
  l.region,
  l.image_path,
  l.availability,
  l.published_at,
  case
    when p.role = 'sales_admin' and p.whatsapp_number is not null then p.whatsapp_number
    else s.admin_whatsapp
  end as whatsapp_number,
  sp.id as seller_id,
  sp.display_name as seller_name,
  sp.slug as seller_slug,
  sp.logo_path as seller_logo_path
from public.listings l
join public.profiles p on p.id = l.created_by
cross join public.app_settings s
left join public.seller_profiles sp on sp.id = l.created_by
where l.publish_status = 'published';

-- ---------------------------------------------------------------------------
-- Storage: sales admins may also upload their shop logo and cover
-- ---------------------------------------------------------------------------

drop policy "Staff upload public images" on storage.objects;

create policy "Staff upload public images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-images'
    and (
      (select public.is_super_admin())
      or (
        (select public.is_active_sales_admin())
        and (storage.foldername(name))[1] in ('listings', 'sellers')
      )
    )
  );
