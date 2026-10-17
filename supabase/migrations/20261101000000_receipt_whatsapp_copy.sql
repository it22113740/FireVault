-- WhatsApp only shows JPEG/PNG images (WebP counts as a sticker), so each
-- order also gets a JPEG copy of its receipt, sent to the super admin through
-- a short-lived signed URL. Still written only by the server.
update storage.buckets
   set allowed_mime_types = array['image/webp', 'image/jpeg']
 where id = 'receipts';
