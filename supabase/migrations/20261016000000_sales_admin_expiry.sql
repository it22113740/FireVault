-- Sales admin access lasts one month per activation. A sales admin is active
-- only while is_active is true AND active_until is in the future; after that
-- they are treated as inactive (login, proxy, RLS) until a super admin
-- activates them again, which starts a new month. No scheduled job needed:
-- expiry is a date comparison.

alter table public.profiles add column active_until timestamptz;

-- Existing sales admins get a month from now
update public.profiles
   set active_until = now() + interval '1 month'
 where role = 'sales_admin' and is_active;

create or replace function public.is_active_sales_admin()
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
  );
$$;

-- Users can't extend their own access
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
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
