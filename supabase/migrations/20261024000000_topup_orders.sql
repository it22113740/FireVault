-- Top-up orders. A signed-in customer picks a top-up, pays by bank transfer
-- to the account in app_settings, and submits their player UID, quantity
-- (1–5), WhatsApp number and a receipt image. The super admin is alerted on
-- WhatsApp (Twilio) and by email, tops up manually, then closes the order on
-- /admin/orders.

-- Bank account buyers pay into, shown in the Buy dialog (public on purpose:
-- every buyer needs it)
alter table public.app_settings
  add column bank_account_name text not null default '' check (char_length(bank_account_name) <= 100),
  add column bank_account_number text not null default '' check (bank_account_number ~ '^[0-9 -]{0,30}$'),
  add column bank_name text not null default '' check (char_length(bank_name) <= 100),
  add column bank_branch text not null default '' check (char_length(bank_branch) <= 100);

create type public.topup_order_status as enum ('open', 'closed');

create table public.topup_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  topup_id uuid references public.topups (id) on delete set null,
  -- Copied from the top-up when ordered, so later price edits don't change it
  topup_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  currency text not null,
  quantity int not null check (quantity between 1 and 5),
  total numeric(12, 2) not null check (total >= 0),
  player_uid text not null check (player_uid ~ '^[0-9]{5,20}$'),
  whatsapp_number text not null check (whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  receipt_path text not null,                 -- private bucket 'receipts'
  status public.topup_order_status not null default 'open',
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index topup_orders_status_created_at_idx on public.topup_orders (status, created_at desc);
create index topup_orders_customer_id_idx on public.topup_orders (customer_id, created_at desc);

-- The order's name, price and total always come from the live top-up, never
-- from the client; new orders always start open
create function public.prepare_topup_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topup public.topups%rowtype;
begin
  select * into v_topup from public.topups where id = new.topup_id and status = 'published';
  if not found then
    raise exception 'This top-up is no longer available' using errcode = 'P0002';
  end if;

  -- Also enforced here so a direct API insert can't flood the queue
  if (
    select count(*) from public.topup_orders
    where customer_id = new.customer_id and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many orders. Please try again later.' using errcode = 'P0001';
  end if;

  -- Receipts live in the customer's own folder (written by the server)
  if new.receipt_path !~ ('^' || new.customer_id::text || '/[0-9a-f-]{36}\.webp$') then
    raise exception 'Upload the receipt again' using errcode = '22023';
  end if;

  new.topup_name := v_topup.name;
  new.unit_price := v_topup.price;
  new.currency := (select currency from public.app_settings where id = 1);
  new.total := v_topup.price * new.quantity;
  new.status := 'open';
  new.closed_at := null;
  new.closed_by := null;
  new.created_at := now();
  return new;
end;
$$;

create trigger topup_orders_prepare
  before insert on public.topup_orders
  for each row execute function public.prepare_topup_order();

-- Only the open/closed state changes after ordering; who closed it and when
-- are stamped here
create function public.guard_topup_order_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.customer_id := old.customer_id;
  new.topup_id := old.topup_id;
  new.topup_name := old.topup_name;
  new.unit_price := old.unit_price;
  new.currency := old.currency;
  new.quantity := old.quantity;
  new.total := old.total;
  new.player_uid := old.player_uid;
  new.whatsapp_number := old.whatsapp_number;
  new.receipt_path := old.receipt_path;
  new.created_at := old.created_at;

  if new.status = 'closed' and old.status <> 'closed' then
    new.closed_at := now();
    new.closed_by := (select auth.uid());
  elsif new.status = 'open' then
    new.closed_at := null;
    new.closed_by := null;
  else
    new.closed_at := old.closed_at;
    new.closed_by := old.closed_by;
  end if;
  return new;
end;
$$;

create trigger topup_orders_guard_changes
  before update on public.topup_orders
  for each row execute function public.guard_topup_order_changes();

alter table public.topup_orders enable row level security;

create policy "Customers place own orders"
  on public.topup_orders for insert to authenticated
  with check (customer_id = (select auth.uid()) and (select public.is_active_customer()));

create policy "Customers read own orders"
  on public.topup_orders for select to authenticated
  using (customer_id = (select auth.uid()));

create policy "Super admins manage orders"
  on public.topup_orders for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- Receipts: written by the server (service role) after checking the image;
-- only super admins can read them (short-lived signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 2097152, array['image/webp'])
on conflict (id) do nothing;

create policy "Super admins read receipts"
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (select public.is_super_admin()));
