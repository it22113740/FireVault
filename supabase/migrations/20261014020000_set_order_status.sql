-- Admin order status changes, applied atomically with the listing status:
--   pending -> paid | rejected
--   paid    -> delivered | rejected
--   delivered: listing -> sold; rejected: listing -> available
-- SECURITY INVOKER, so the admin RLS policies apply on top of the explicit check.

create function public.set_order_status(p_order_id uuid, p_status public.order_status)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.order_status;
  v_listing_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Row lock so two admins can't apply conflicting transitions
  select status, listing_id into v_current, v_listing_id
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if not (
    (v_current = 'pending' and p_status in ('paid', 'rejected'))
    or (v_current = 'paid' and p_status in ('delivered', 'rejected'))
  ) then
    raise exception 'Cannot change order from % to %', v_current, p_status
      using errcode = 'P0001', hint = 'invalid_transition';
  end if;

  update public.orders set status = p_status where id = p_order_id;

  if p_status = 'delivered' then
    update public.listings set status = 'sold' where id = v_listing_id;
  elsif p_status = 'rejected' then
    update public.listings
       set status = 'available'
     where id = v_listing_id and status = 'reserved';
  end if;
end;
$$;

revoke execute on function public.set_order_status(uuid, public.order_status) from public;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
