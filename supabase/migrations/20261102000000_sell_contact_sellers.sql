-- Sellers shown in the homepage "Want to sell account?" window, chosen by
-- the super admin in /admin/settings (in display order). Customers pick one
-- and WhatsApp that seller directly. Empty hides the button.
alter table public.app_settings
  add column sell_contact_seller_ids uuid[] not null default '{}';
