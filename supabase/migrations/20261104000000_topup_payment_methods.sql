-- Top-up payment methods. Buyers pay by bank transfer (any of several
-- accounts), eZ Cash or Binance Pay, and upload proof of that payment: a bank
-- payment slip, an eZ Cash transfer screenshot or a Binance transfer
-- screenshot. Each order records the method it was paid with.
--
-- The single-account bank_* columns stay for now (the deployed build reads
-- them until this one is live); their account is copied into bank_accounts,
-- which replaces them. Drop them in a later migration.

create type public.topup_payment_method as enum ('bank', 'ezcash', 'binance');

-- All public on purpose (shown in the Buy dialog). bank_accounts holds
-- [{ accountName, accountNumber, bankName, branch }], shape checked by Zod.
alter table public.app_settings
  add column bank_accounts jsonb not null default '[]'
    check (jsonb_typeof(bank_accounts) = 'array' and jsonb_array_length(bank_accounts) <= 10),
  add column ezcash_number text not null default ''
    check (ezcash_number = '' or ezcash_number ~ '^\+[1-9][0-9]{6,14}$'),
  -- Payment instructions in English, Sinhala and Tamil
  add column ezcash_message_en text not null default '' check (char_length(ezcash_message_en) <= 1000),
  add column ezcash_message_si text not null default '' check (char_length(ezcash_message_si) <= 1000),
  add column ezcash_message_ta text not null default '' check (char_length(ezcash_message_ta) <= 1000),
  add column binance_pay_id text not null default '' check (binance_pay_id ~ '^[0-9]{0,20}$'),
  add column binance_name text not null default '' check (char_length(binance_name) <= 100);

update public.app_settings
   set bank_accounts = jsonb_build_array(jsonb_build_object(
         'accountName', bank_account_name,
         'accountNumber', bank_account_number,
         'bankName', bank_name,
         'branch', bank_branch
       ))
 where bank_account_number <> '';

-- Existing orders were all bank transfers
alter table public.topup_orders
  add column payment_method public.topup_payment_method not null default 'bank';

-- Same as before, plus the payment method can't change after ordering
create or replace function public.guard_topup_order_changes()
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
  new.payment_method := old.payment_method;
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
