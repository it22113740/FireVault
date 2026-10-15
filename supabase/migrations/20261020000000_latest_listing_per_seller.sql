-- Home page "Latest accounts": each seller's newest available listing.
-- Listings without a shop (the super admin's own) count as one seller.
-- Reads published_listings, which already exposes published rows only.
create view public.latest_listing_per_seller
with (security_invoker = true)
as
select distinct on (coalesce(seller_id, '00000000-0000-0000-0000-000000000000'::uuid)) *
from public.published_listings
where availability = 'available'
order by coalesce(seller_id, '00000000-0000-0000-0000-000000000000'::uuid), published_at desc;

grant select on public.latest_listing_per_seller to anon, authenticated;
