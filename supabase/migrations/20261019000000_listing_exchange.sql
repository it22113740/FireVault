-- Sellers can mark a listing as open to exchange (swap for another account).
-- Not part of the listing trigger's content check, so flipping it on a live
-- listing doesn't send it back to review.
alter table public.listings add column exchange_available boolean not null default false;

-- Expose it publicly; new columns go at the end of the view
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
  sp.logo_path as seller_logo_path,
  l.exchange_available
from public.listings l
join public.profiles p on p.id = l.created_by
cross join public.app_settings s
left join public.seller_profiles sp on sp.id = l.created_by
where l.publish_status = 'published';
