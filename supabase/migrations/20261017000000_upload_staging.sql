-- Staging bucket for large image uploads (up to 30 MB). Server Actions can't
-- receive files that big (Vercel caps requests at 4.5 MB), so the browser
-- uploads the original here through a signed upload URL issued by a Server
-- Action; the server then converts it to WebP into 'public-images' and
-- deletes the original. No policies: signed URLs authorise the upload and
-- the service role reads and deletes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 31457280, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
