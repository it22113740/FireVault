import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Stored WebP must fit the bucket's 2 MB limit
const MAX_STORED_BYTES = 2 * 1024 * 1024;

export type ConvertedImage = { path: string; body: Buffer };

// Checks type and size on the server (never trust the browser's MIME type),
// strips metadata, resizes and converts to WebP under a random file name.
export async function toWebp(
  file: unknown,
  { folder, maxWidth = 1600 }: { folder?: string; maxWidth?: number } = {}
): Promise<ConvertedImage | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Images must be 4 MB or smaller." };

  const input = Buffer.from(await file.arrayBuffer());
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
