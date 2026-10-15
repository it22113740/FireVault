import { createStagedUpload } from "@/lib/actions/uploads";

// Uploads an original image straight to the staging bucket (bypassing the
// Server Action size limit) and reports progress. Resolves to the staged
// path to pass to saveListing/saveTopup as "stagedImage".
export async function stageImage(file: File, onProgress?: (percent: number) => void) {
  const result = await createStagedUpload(file.type);
  if (!result.ok) throw new Error(result.error);
  const { path, signedUrl } = result.data;

  await new Promise<void>((resolve, reject) => {
    // XHR rather than fetch: fetch can't report upload progress
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("x-upsert", "false");
    request.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error("Upload failed. Please try again."));
    request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    request.send(file);
  });

  return path;
}
