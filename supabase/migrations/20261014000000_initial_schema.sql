-- FireVault initial schema: profiles, listings, orders, RLS, storage, place_order RPC

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('user', 'admin');
create type public.listing_status as enum ('available', 'reserved', 'sold', 'archived');
create type public.order_status as enum ('pending', 'paid', 'delivered', 'rejected', 'refunded');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'user'
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  price numeric(10, 2) not null check (price >= 0),
  level integer check (level >= 0),
  rank text,
  region text,
  highlights text[] not null default '{}',
  images text[] not null default '{}',
  status public.listing_status not null default 'available',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  buyer_name text not null check (char_length(buyer_name) between 1 and 100),
  buyer_phone text not null check (char_length(buyer_phone) between 5 and 30),
  buyer_email text check (char_length(buyer_email) <= 254),
  payment_method text not null check (char_length(payment_method) between 1 and 50),
  -- Object path inside the private `payment-slips` bucket (read via signed URL)
  payment_slip_url text,
  amount numeric(10, 2) not null check (amount >= 0),
  status public.order_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now()
);

create index listings_status_created_at_idx on public.listings (status, created_at desc);
create index orders_listing_id_idx on public.orders (listing_id);
create index orders_status_created_at_idx on public.orders (status, created_at desc);

-- Backstop against double-sell: at most one live order per listing
create unique index orders_one_active_per_listing_idx
  on public.orders (listing_id)
  where status in ('pending', 'paid', 'delivered');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so policies can check the role without recursing into profiles RLS
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Create a profile row for every new auth user (role defaults to 'user')
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;

-- profiles
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Admins have full access to profiles"
  on public.profiles for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- listings
create policy "Public can read available and reserved listings"
  on public.listings for select
  to anon, authenticated
  using (status in ('available', 'reserved'));

create policy "Admins have full access to listings"
  on public.listings for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- orders: no public INSERT policy on purpose. Public orders go through
-- place_order() so the listing is reserved in the same transaction; a direct
-- insert would let buyers order listings that are already reserved or sold.
create policy "Admins have full access to orders"
  on public.orders for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- place_order RPC
-- ---------------------------------------------------------------------------

create function public.place_order(
  p_listing_id uuid,
  p_buyer_name text,
  p_buyer_phone text,
  p_buyer_email text,
  p_payment_method text,
  p_payment_slip_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price numeric(10, 2);
  v_order_id uuid;
begin
  -- Conditional update takes a row lock, so concurrent callers serialize here
  -- and only the first one sees status = 'available'.
  update public.listings
     set status = 'reserved'
   where id = p_listing_id
     and status = 'available'
  returning price into v_price;

  if not found then
    raise exception 'Listing is not available'
      using errcode = 'P0001', hint = 'listing_unavailable';
  end if;

  -- Amount comes from the listing, never from the client
  insert into public.orders (
    listing_id, buyer_name, buyer_phone, buyer_email,
    payment_method, payment_slip_url, amount
  )
  values (
    p_listing_id, p_buyer_name, p_buyer_phone, nullif(p_buyer_email, ''),
    p_payment_method, p_payment_slip_url, v_price
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(uuid, text, text, text, text, text) from public;
grant execute on function public.place_order(uuid, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-slips', 'payment-slips', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- listing-images: public bucket, so files are served by public URL without a
-- SELECT policy (which would also allow listing every object). Admin writes only.
create policy "Admins can manage listing images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'listing-images' and (select public.is_admin()))
  with check (bucket_id = 'listing-images' and (select public.is_admin()));

-- payment-slips: anyone can upload, nobody but admins can read
create policy "Public can upload payment slips"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'payment-slips');

create policy "Admins can manage payment slips"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'payment-slips' and (select public.is_admin()))
  with check (bucket_id = 'payment-slips' and (select public.is_admin()));
