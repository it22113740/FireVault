-- Shared listings: a super admin can list one account under several seller
-- shops. The listing stays owned by the super admin (listings.created_by), so
-- only super admins edit its content; listing_sellers holds the shops it's
-- shown under. Each shop's seller can mark it Reserved/Available, and that
-- applies everywhere since it's one row. A listing with a single seller keeps
-- the old model instead: created_by is that seller and there are no rows here.

create table public.listing_sellers (
  listing_id uuid not null references public.listings (id) on delete cascade,
  seller_id uuid not null references public.seller_profiles (id) on delete cascade,
  position smallint not null default 0,      -- order the shops are shown in
  primary key (listing_id, seller_id)
);

create index listing_sellers_seller_id_idx on public.listing_sellers (seller_id);

alter table public.listing_sellers enable row level security;

create policy "Anyone reads listing sellers"
  on public.listing_sellers for select to anon, authenticated
  using (true);

create policy "Super admins manage listing sellers"
  on public.listing_sellers for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- New columns go at the end of the view:
--   seller_ids: every shop the listing is shown under (for filtering)
--   sellers:    those shops with name, slug, logo and WhatsApp, in order
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
  l.exchange_available,
  coalesce(shared.seller_ids, case when sp.id is not null then array[sp.id] else '{}'::uuid[] end) as seller_ids,
  coalesce(
    shared.sellers,
    case
      when sp.id is not null then jsonb_build_array(jsonb_build_object(
        'id', sp.id,
        'name', sp.display_name,
        'slug', sp.slug,
        'logo_path', sp.logo_path,
        'whatsapp_number', coalesce(p.whatsapp_number, s.admin_whatsapp)
      ))
      else '[]'::jsonb
    end
  ) as sellers
from public.listings l
join public.profiles p on p.id = l.created_by
cross join public.app_settings s
left join public.seller_profiles sp on sp.id = l.created_by
left join lateral (
  select
    array_agg(ls.seller_id order by ls.position) as seller_ids,
    jsonb_agg(
      jsonb_build_object(
        'id', ssp.id,
        'name', ssp.display_name,
        'slug', ssp.slug,
        'logo_path', ssp.logo_path,
        'whatsapp_number', coalesce(sprof.whatsapp_number, s.admin_whatsapp)
      )
      order by ls.position
    ) as sellers
  from public.listing_sellers ls
  join public.seller_profiles ssp on ssp.id = ls.seller_id
  join public.profiles sprof on sprof.id = ls.seller_id
  where ls.listing_id = l.id
) shared on shared.seller_ids is not null
where l.publish_status = 'published';

-- Its "*" was expanded when it was created; recreate it so it carries the
-- new columns too (same rows, columns added at the end)
create or replace view public.latest_listing_per_seller
with (security_invoker = true)
as
select distinct on (coalesce(seller_id, '00000000-0000-0000-0000-000000000000'::uuid)) *
from public.published_listings
where availability = 'available'
order by coalesce(seller_id, '00000000-0000-0000-0000-000000000000'::uuid), published_at desc;

-- "For sale now" on each shop counts shared listings too, and the shop page
-- gets the seller's WhatsApp for its "Contact via WhatsApp" button. It runs
-- as the view owner so it can read that one profiles column (profiles RLS
-- hides other users); every other source is publicly readable anyway. Buyers
-- already reach the same number through the seller's listings.
create or replace view public.seller_directory
with (security_invoker = false)
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
  coalesce(l.live_listings, 0) as live_listings,
  p.whatsapp_number
from public.seller_profiles sp
join public.profiles p on p.id = sp.id
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
  -- shop_id, not seller_id: published_listings already has a seller_id column
  select shared.shop_id, count(*) as live_listings
  from public.published_listings pl, unnest(pl.seller_ids) as shared(shop_id)
  group by shared.shop_id
) l on l.shop_id = sp.id;

-- A shop on a shared listing can mark it Reserved/Available (nothing else).
-- Runs as the owner so it can update a listing the seller doesn't own; the
-- listings trigger still applies.
create function public.set_shared_listing_availability(p_listing_id uuid, p_availability public.availability)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_sales_admin() then
    return false;
  end if;
  if not exists (
    select 1 from public.listing_sellers
    where listing_id = p_listing_id and seller_id = (select auth.uid())
  ) then
    return false;
  end if;

  update public.listings
     set availability = p_availability
   where id = p_listing_id and publish_status = 'published';
  return found;
end;
$$;

revoke execute on function public.set_shared_listing_availability(uuid, public.availability) from public;
grant execute on function public.set_shared_listing_availability(uuid, public.availability) to authenticated;
