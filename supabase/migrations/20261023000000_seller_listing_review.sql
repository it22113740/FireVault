-- Per-seller review setting. The super admin chooses it when approving an
-- application and can change it on /admin/sales-admins. Sellers with
-- listings_need_review = false publish their listings straight to the store
-- (and edits to their live listings stay live); everyone else keeps the
-- draft → review → publish flow. Existing sellers keep needing review.

alter table public.profiles
  add column listings_need_review boolean not null default true;

-- True for an active sales admin whose listings skip review
create function public.can_self_publish()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'sales_admin'
      and is_active
      and active_until > now()
      and not listings_need_review
  );
$$;

revoke execute on function public.can_self_publish() from public;
grant execute on function public.can_self_publish() to authenticated;

-- Sellers can't switch off their own review
create or replace function public.guard_profile_changes()
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
    new.active_until := old.active_until;
    new.listings_need_review := old.listings_need_review;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

-- Same rules as before, except a self-publishing seller may set
-- 'published' on their own drafts/rejected listings and keeps live listings
-- live when editing them. Ownership and review fields stay locked.
create or replace function public.guard_listing_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_privileged boolean := (select auth.role()) = 'service_role' or public.is_super_admin();
  v_self_publish boolean := not v_privileged and public.can_self_publish();
  v_content_changed boolean;
begin
  if tg_op = 'INSERT' then
    if not v_privileged then
      if new.publish_status not in ('draft', 'pending_review')
         and not (v_self_publish and new.publish_status = 'published') then
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
      if v_self_publish then
        if new.publish_status not in ('published', 'pending_review', 'archived') then
          raise exception 'Invalid status change' using errcode = '42501';
        end if;
        -- No review for this seller: edits stay live
        if new.publish_status = 'pending_review' then
          new.publish_status := 'published';
        end if;
      elsif v_content_changed then
        new.publish_status := 'pending_review';
      elsif new.publish_status = 'pending_review' then
        -- "Submit changes" with nothing changed: stay live
        new.publish_status := 'published';
      elsif new.publish_status not in ('published', 'archived') then
        raise exception 'Invalid status change' using errcode = '42501';
      end if;
    elsif old.publish_status in ('draft', 'rejected') then
      if new.publish_status not in ('draft', 'pending_review')
         and not (v_self_publish and new.publish_status = 'published') then
        raise exception 'Only a super admin can publish listings' using errcode = '42501';
      end if;
      if new.publish_status = 'published' then
        new.rejection_reason := null;
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

-- Let self-publishing sellers insert straight as published
drop policy "Sales admins create own listings" on public.listings;
create policy "Sales admins create own listings"
  on public.listings for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_active_sales_admin())
    and (
      publish_status in ('draft', 'pending_review')
      or (publish_status = 'published' and (select public.can_self_publish()))
    )
  );
