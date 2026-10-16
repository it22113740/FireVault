export const PUBLIC_IMAGES_BUCKET = "public-images";
export const APPLICATIONS_BUCKET = "applications";
export const RECEIPTS_BUCKET = "receipts";
export const UPLOADS_BUCKET = "uploads";

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");

// Public URL for a path in the public-images bucket ('' when no image yet)
export function publicImageUrl(path: string | null | undefined) {
  return path ? `${baseUrl}/storage/v1/object/public/${PUBLIC_IMAGES_BUCKET}/${path}` : "";
}
