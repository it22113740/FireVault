-- Customers log in to browse the store and leave seller feedback. Kept in its
-- own migration: a new enum value can't be used in the transaction that adds it.
alter type public.user_role add value if not exists 'customer';
