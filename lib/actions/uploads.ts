"use server";

import { randomUUID } from "node:crypto";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { requireStaff } from "@/lib/auth";
import { UPLOADS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

// Signed URL for the browser to upload an original image (up to 30 MB, the
// bucket's limit) straight to Storage, into a folder named after the uploader.
// saveListing/saveTopup then convert it with stagedToWebp().
export async function createStagedUpload(
  contentType: string
): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  const profile = await requireStaff();
  const extension = EXTENSIONS[contentType];
  if (!extension) return fail("Use a JPG, PNG or WebP image.");

  const path = `${profile.id}/${randomUUID()}.${extension}`;
  const { data, error } = await createAdminClient()
    .storage.from(UPLOADS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return fail("Couldn't start the upload. Please try again.");

  return ok({ path, signedUrl: data.signedUrl });
}
