-- FireVault store schema (PLAN.md "Database schema").
-- Replaces the checkout/orders schema from 20261014000000_initial_schema.sql.
-- The old listings/orders held test data only and are dropped.

-- ---------------------------------------------------------------------------
-- Remove the checkout/orders schema
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can manage listing images" on storage.objects;
drop policy if exists "Public can upload payment slips" on storage.objects;
drop policy if exists "Admins can manage payment slips" on storage.objects;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.place_order(uuid, text, text, text, text, text);
drop function if exists public.set_order_status(uuid, public.order_status);
drop function if exists public.track_order(uuid, text);

drop table if exists public.orders;
drop table if exists public.listings;
drop table if exists public.profiles;

drop function if exists public.is_admin();
drop type if exists public.order_status;
drop type if exists public.listing_status;
drop type if exists public.user_role;

-- The old 'listing-images' and 'payment-slips' buckets are left in place:
-- Storage blocks deleting objects from SQL. Empty and delete them from the
-- dashboard (Storage) once you no longer need them.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('super_admin', 'sales_admin');
create type public.application_status as enum ('pending', 'approved', 'denied');
create type public.publish_status as enum ('draft', 'pending_review', 'published', 'rejected', 'archived');
create type public.availability as enum ('available', 'reserved');
create type public.topup_category as enum ('membership', 'vip_bundle', 'diamonds');
create type public.topup_status as enum ('draft', 'published');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Phone numbers are E.164 (+94771234567) so wa.me links always work
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (char_length(full_name) between 1 and 100),
  email text not null unique check (email = lower(email)),
  whatsapp_number text check (whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  contact_number text check (contact_number ~ '^\+[1-9][0-9]{6,14}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sales_admin_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 100),
  email text not null check (email = lower(email)),
  whatsapp_number text not null check (whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  contact_number text not null check (contact_number ~ '^\+[1-9][0-9]{6,14}$'),
  screenshot_path text not null,              -- private bucket 'applications'
  status public.application_status not null default 'pending',
  deny_reason text check (char_length(deny_reason) <= 500),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  user_id uuid references public.profiles (id) on delete set null,  -- set on approval
  ip_hash text,                               -- salted hash, for rate limiting only
  created_at timestamptz not null default now()
);

create unique index one_pending_application_per_email
  on public.sales_admin_applications (email) where status = 'pending';
create index sales_admin_applications_status_idx
  on public.sales_admin_applications (status, created_at desc);
create index sales_admin_applications_ip_idx
  on public.sales_admin_applications (ip_hash, created_at);

-- description/region/image_path default to '' so drafts can be saved
-- incomplete; the check enforces them once a listing is submitted or live.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  price numeric(12, 2) not null default 0 check (price >= 0),
  region text not null default '',
  image_path text not null default '',        -- public bucket 'public-images'
  availability public.availability not null default 'available',
  publish_status public.publish_status not null default 'draft',
  rejection_reason text check (char_length(rejection_reason) <= 500),
  created_by uuid not null references public.profiles (id),
  reviewed_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_complete_unless_draft check (
    publish_status in ('draft', 'rejected')
    or (description <> '' and price > 0 and region <> '' and image_path <> '')
  )
);

create index listings_public_idx on public.listings (publish_status, availability, region);
create index listings_created_by_idx on public.listings (created_by);

create table public.topups (
  id uuid primary key default gen_random_uuid(),
  category public.topup_category not null,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  price numeric(12, 2) not null default 0 check (price >= 0),
  image_path text not null default '',        -- public bucket 'public-images'
  status public.topup_status not null default 'draft',
  sort_order int not null default 0,
  created_by uuid not null references public.profiles (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topups_complete_when_published check (
    status = 'draft' or (description <> '' and price > 0 and image_path <> '')
  )
);

create index topups_public_idx on public.topups (status, category, sort_order);

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  admin_whatsapp text not null default ''
    check (admin_whatsapp = '' or admin_whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  currency text not null default 'LKR' check (currency ~ '^[A-Z]{3}$'),
  inactive_message text not null default
    'Your account is inactive. Please contact the administrator to make the payment and reactivate your account.',
  regions text[] not null default array['IND', 'SG', 'BD', 'ID', 'BR', 'ME']
);

insert into public.app_settings (id) values (1);

create table public.audit_logs (
  id bigserial primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,                        -- 'listing.approve', 'salesadmin.deactivate', ...
  entity text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so policies can read profiles without
-- recursing into its own RLS)
-- ---------------------------------------------------------------------------

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'super_admin'
  );
$$;

create function public.is_active_sales_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'sales_admin' and is_active
  );
$$;

revoke execute on function public.is_super_admin() from public;
revoke execute on function public.is_active_sales_admin() from public;
grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.is_active_sales_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger topups_set_updated_at
  before update on public.topups
  for each row execute function public.set_updated_at();

-- Listing workflow rules that must hold even if the UI is bypassed:
--  * non-super-admins can never publish, and can't touch ownership/review fields
--  * a sales admin editing a published listing sends it back to pending_review
--    (availability-only changes, and archiving, stay instant)
--  * submitted_at / published_at are stamped here, not by clients
create function public.guard_listing_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_privileged boolean := (select auth.role()) = 'service_role' or public.is_super_admin();
  v_content_changed boolean;
begin
  if tg_op = 'INSERT' then
    if not v_privileged then
      if new.publish_status not in ('draft', 'pending_review') then
        raise exception 'Only a super admin can publish listings' using errcode = '42501';
      end if;
      new.created_by := (select auth.uid());
      new.reviewed_by := null;
      new.rejection_reason := null;
    end if;
    new.submitted_at := case when new.publish_status = 'pending_review' then now() end;
    new.published_at := case when new.publish_status = 'published' then now() end;
    return new;
  end if;

  if not v_privileged then
    new.created_by := old.created_by;
    new.reviewed_by := old.reviewed_by;
    new.rejection_reason := old.rejection_reason;
    new.published_at := old.published_at;
    new.submitted_at := old.submitted_at;

    v_content_changed :=
      (new.title, new.description, new.price, new.region, new.image_path)
      is distinct from
      (old.title, old.description, old.price, old.region, old.image_path);

    if old.publish_status = 'published' then
      if v_content_changed then
        new.publish_status := 'pending_review';
      elsif new.publish_status not in ('published', 'archived') then
        raise exception 'Invalid status change' using errcode = '42501';
      end if;
    elsif old.publish_status in ('draft', 'rejected') then
      if new.publish_status not in ('draft', 'pending_review') then
        raise exception 'Only a super admin can publish listings' using errcode = '42501';
      end if;
    else
      raise exception 'This listing can''t be edited right now' using errcode = '42501';
    end if;
  end if;

  if new.publish_status = 'pending_review' and old.publish_status <> 'pending_review' then
    new.submitted_at := now();
  end if;
  if new.publish_status = 'published' and old.publish_status <> 'published' then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger listings_guard_changes
  before insert or update on public.listings
  for each row execute function public.guard_listing_changes();

create function public.stamp_topup_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger topups_stamp_published_at
  before insert or update on public.topups
  for each row execute function public.stamp_topup_published_at();

-- Users may edit their own contact details, never their role/active flag/email
create function public.guard_profile_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not ((select auth.role()) = 'service_role' or public.is_super_admin()) then
    new.id := old.id;
    new.role := old.role;
    new.email := old.email;
    new.is_active := old.is_active;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_changes
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.sales_admin_applications enable row level security;
alter table public.listings enable row level security;
alter table public.topups enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Super admins manage profiles"
  on public.profiles for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- sales_admin_applications: inserted by the /apply server action with the
-- service role (which bypasses RLS); no public access at all
create policy "Super admins read applications"
  on public.sales_admin_applications for select to authenticated
  using ((select public.is_super_admin()));

create policy "Super admins update applications"
  on public.sales_admin_applications for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- listings
create policy "Anyone reads published listings"
  on public.listings for select to anon, authenticated
  using (publish_status = 'published');

create policy "Sales admins read own listings"
  on public.listings for select to authenticated
  using (created_by = (select auth.uid()) and (select public.is_active_sales_admin()));

create policy "Sales admins create own listings"
  on public.listings for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_active_sales_admin())
    and publish_status in ('draft', 'pending_review')
  );

create policy "Sales admins update own editable listings"
  on public.listings for update to authenticated
  using (
    created_by = (select auth.uid())
    and (select public.is_active_sales_admin())
    and publish_status in ('draft', 'rejected', 'published')
  )
  with check (created_by = (select auth.uid()) and (select public.is_active_sales_admin()));

create policy "Sales admins delete own unpublished listings"
  on public.listings for delete to authenticated
  using (
    created_by = (select auth.uid())
    and (select public.is_active_sales_admin())
    and publish_status in ('draft', 'rejected')
  );

create policy "Super admins manage listings"
  on public.listings for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- topups
create policy "Anyone reads published top-ups"
  on public.topups for select to anon, authenticated
  using (status = 'published');

create policy "Super admins manage top-ups"
  on public.topups for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- app_settings
create policy "Anyone reads settings"
  on public.app_settings for select to anon, authenticated
  using (true);

create policy "Super admins update settings"
  on public.app_settings for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- audit_logs: written by server actions as the acting user
create policy "Super admins read audit logs"
  on public.audit_logs for select to authenticated
  using ((select public.is_super_admin()));

create policy "Staff write own audit entries"
  on public.audit_logs for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and ((select public.is_super_admin()) or (select public.is_active_sales_admin()))
  );

-- ---------------------------------------------------------------------------
-- Public listing view
-- ---------------------------------------------------------------------------

-- Customers message the seller for sales admin listings and the main admin for
-- super admin listings. profiles has no public read, so this view (owner
-- rights, published rows only, no private columns) exposes just that number.
create view public.published_listings
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
  end as whatsapp_number
from public.listings l
join public.profiles p on p.id = l.created_by
cross join public.app_settings s
where l.publish_status = 'published';

revoke all on public.published_listings from anon, authenticated;
grant select on public.published_listings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Server actions convert every upload to WebP before storing it
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-images', 'public-images', true, 2097152, array['image/webp']),
  ('applications', 'applications', false, 2097152, array['image/webp'])
on conflict (id) do nothing;

-- public-images: served by public URL (no SELECT policy, so the bucket can't
-- be listed). Super admins write anywhere; active sales admins only under
-- listings/ and only their own files.
create policy "Staff upload public images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-images'
    and (
      (select public.is_super_admin())
      or ((select public.is_active_sales_admin()) and (storage.foldername(name))[1] = 'listings')
    )
  );

create policy "Staff delete own public images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'public-images'
    and (
      (select public.is_super_admin())
      or ((select public.is_active_sales_admin()) and owner_id = (select auth.uid())::text)
    )
  );

-- applications: written by the service role; super admins read (signed URLs)
create policy "Super admins read application screenshots"
  on storage.objects for select to authenticated
  using (bucket_id = 'applications' and (select public.is_super_admin()));
