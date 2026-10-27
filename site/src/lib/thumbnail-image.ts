// Browser-only: turns whatever image the owner picks (often a 1–3 MB AI render) into the Lab's
// thumbnail: centre-cropped to 16:9, 640x360, WebP (JPEG where the browser cannot encode WebP).
// The API takes at most 512 KiB; a pixel-art thumbnail usually comes out around 20–60 KB.
export const THUMB_WIDTH = 640;
export const THUMB_HEIGHT = 360;
const MAX_BYTES = 512 * 1024;

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** `crisp` keeps hard pixel edges (nearest neighbour); otherwise the scale-down is smoothed. */
export async function makeThumbnail(file: Blob, crisp: boolean): Promise<Blob> {
  const image = await createImageBitmap(file);
  const ratio = THUMB_WIDTH / THUMB_HEIGHT;
  let sw = image.width;
  let sh = image.height;
  if (sw / sh > ratio) sw = Math.round(sh * ratio);
  else sh = Math.round(sw / ratio);
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_WIDTH;
  canvas.height = THUMB_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = !crisp;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
  image.close();
  for (const [type, quality] of [
    ["image/webp", 0.86],
    ["image/webp", 0.7],
    ["image/jpeg", 0.85],
    ["image/jpeg", 0.7],
  ] as const) {
    const blob = await encode(canvas, type, quality);
    // Safari returns PNG when asked for WebP; skip to JPEG then.
    if (blob && blob.type === type && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("This image could not be made small enough. Try a simpler one.");
}
