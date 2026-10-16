-- Respect topup_orders RLS: only super admins see every customer's totals.
create view public.customer_topup_totals
with (security_invoker = true)
as select customer_id, currency, count(*)::integer as order_count,
  sum(total) as total_amount
from public.topup_orders
where customer_id is not null
group by customer_id, currency;
