-- Guest orders are created only by the validated server action using the service role.
-- Existing RLS continues to prevent anonymous direct inserts and reads.
alter table public.topup_orders alter column customer_id drop not null;
create index topup_orders_whatsapp_created_idx on public.topup_orders (whatsapp_number, created_at desc);

create or replace function public.prepare_topup_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topup public.topups%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.whatsapp_number, 0));
  select * into v_topup from public.topups where id = new.topup_id and status = 'published';
  if not found then
    raise exception 'This top-up is no longer available' using errcode = 'P0002';
  end if;

  -- Also enforced here so a direct API insert can't flood the queue
  if (
    select count(*) from public.topup_orders
    where whatsapp_number = new.whatsapp_number and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many orders. Please try again later.' using errcode = 'P0001';
  end if;

  -- Receipts live in the customer's own folder (written by the server)
  if new.receipt_path !~ ('^' || coalesce(new.customer_id::text, 'guests') || '/[0-9a-f-]{36}\.webp$') then
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

