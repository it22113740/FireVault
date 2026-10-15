-- Nullable for applications submitted before group links were collected.
alter table public.sales_admin_applications
  add column whatsapp_group_url text
  check (whatsapp_group_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]+/?([?][^#]*)?(#.*)?$');
