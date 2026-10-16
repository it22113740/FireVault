// Browser only. Phone photos of receipts are often over the 4 MB Server Action
// limit (lib/images.ts), so larger ones are scaled down to a JPEG first. The
// server still checks and converts whatever arrives.
const TARGET_BYTES = 3.5 * 1024 * 1024;
const MAX_SIDE = 2400;

export async function shrinkImage(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) return file;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= TARGET_BYTES) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("That image is too large. Try a screenshot of the receipt instead.");
}
