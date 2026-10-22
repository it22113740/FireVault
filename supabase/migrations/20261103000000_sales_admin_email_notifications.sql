-- Durable notifications, scheduled on activation and queued on admin deactivation.
create table public.sales_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('expired', 'admin')),
  due_at timestamptz not null,
  next_attempt_at timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz
);
alter table public.sales_admin_notifications enable row level security;
revoke all on public.sales_admin_notifications from anon, authenticated;
grant all on public.sales_admin_notifications to service_role;
create index sales_admin_notifications_pending_idx
  on public.sales_admin_notifications(next_attempt_at)
  where sent_at is null and cancelled_at is null;

create function public.queue_sales_admin_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if old.role = new.role and old.is_active = new.is_active
       and old.active_until is not distinct from new.active_until then
      return new;
    end if;
    update public.sales_admin_notifications set cancelled_at = now()
      where profile_id = new.id and reason = 'expired'
        and sent_at is null and cancelled_at is null;
    if old.role = 'sales_admin' and new.role = 'sales_admin'
       and old.is_active and not new.is_active then
      insert into public.sales_admin_notifications(profile_id, reason, due_at, next_attempt_at)
        values (new.id, 'admin', now(), now());
    end if;
  end if;
  if new.role = 'sales_admin' and new.is_active and new.active_until is not null then
    insert into public.sales_admin_notifications(profile_id, reason, due_at, next_attempt_at)
      values (new.id, 'expired', new.active_until, new.active_until);
  end if;
  return new;
end;
$$;
revoke all on function public.queue_sales_admin_notification() from public;
create trigger queue_sales_admin_notification
  after insert or update of role, is_active, active_until on public.profiles
  for each row execute function public.queue_sales_admin_notification();

-- Schedule existing active accounts, including already expired accounts.
insert into public.sales_admin_notifications(profile_id, reason, due_at, next_attempt_at)
select id, 'expired', active_until, active_until from public.profiles
where role = 'sales_admin' and is_active and active_until is not null;
