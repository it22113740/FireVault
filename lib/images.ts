import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { UPLOADS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

// Public /apply screenshots come through the Server Action body (Vercel caps
// requests at 4.5 MB). Staff images are staged in Storage first, so they can
// be much larger (see lib/actions/uploads.ts).
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_STAGED_UPLOAD_BYTES = 30 * 1024 * 1024;
// Stored WebP must fit the public bucket's 2 MB limit
const MAX_STORED_BYTES = 2 * 1024 * 1024;

export type ConvertedImage = { path: string; body: Buffer };
type ConvertOptions = { folder?: string; maxWidth?: number };

// Checks the real format (never trust the browser's MIME type), strips
// metadata, resizes and converts to WebP under a random file name.
async function convert(
  input: Buffer,
  { folder, maxWidth = 1600 }: ConvertOptions
): Promise<ConvertedImage | { error: string }> {
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    return { error: "That file isn't a valid image." };
  }
  if (!format || !["jpeg", "png", "webp"].includes(format)) {
    return { error: "Use a JPG, PNG or WebP image." };
  }

  let body = await sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  if (body.byteLength > MAX_STORED_BYTES) {
    body = await sharp(input).rotate().resize({ width: 1200 }).webp({ quality: 70 }).toBuffer();
  }
  if (body.byteLength > MAX_STORED_BYTES) return { error: "That image is too large." };

  const name = `${randomUUID()}.webp`;
  return { path: folder ? `${folder}/${name}` : name, body };
}

export async function toWebp(
  file: unknown,
  options: ConvertOptions = {}
): Promise<ConvertedImage | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Images must be 4 MB or smaller." };
  return convert(Buffer.from(await file.arrayBuffer()), options);
}

// Converts an original the browser uploaded to the staging bucket, then
// deletes the original. Only the uploader's own folder is accepted.
export async function stagedToWebp(
  stagedPath: unknown,
  ownerId: string,
  options: ConvertOptions = {}
): Promise<ConvertedImage | { error: string }> {
  if (
    typeof stagedPath !== "string" ||
    !new RegExp(`^${ownerId}/[0-9a-f-]{36}\\.(jpeg|png|webp)$`).test(stagedPath)
  ) {
    return { error: "Upload the image again." };
  }

  const staging = createAdminClient().storage.from(UPLOADS_BUCKET);
  const { data, error } = await staging.download(stagedPath);
  await staging.remove([stagedPath]);
  if (error || !data) return { error: "Upload the image again." };
  if (data.size > MAX_STAGED_UPLOAD_BYTES) return { error: "Images must be 30 MB or smaller." };

  return convert(Buffer.from(await data.arrayBuffer()), options);
}
