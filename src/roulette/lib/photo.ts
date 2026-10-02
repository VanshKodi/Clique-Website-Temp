export const PHOTO_SIZE = 256;
export const JPEG_QUALITY = 0.82;

export interface CropOptions {
  zoom?: number;
  panX?: number;
  panY?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function cropGeometry(w: number, h: number, opts: CropOptions = {}) {
  const zoom = clamp(opts.zoom ?? 1, 1, 3);
  const side0 = Math.min(w, h);
  const side = side0 / zoom;
  const slackY = h - side0;
  const baseCy = (slackY > 0 ? slackY * 0.15 : 0) + side0 / 2;
  const panX = clamp(opts.panX ?? 0, -1, 1);
  const panY = clamp(opts.panY ?? 0, -1, 1);
  const cx = w / 2 + panX * Math.max(0, (w - side) / 2);
  const cy = clamp(baseCy + panY * Math.max(0, (h - side) / 2), side / 2, h - side / 2);
  return { sx: clamp(cx - side / 2, 0, w - side), sy: clamp(cy - side / 2, 0, h - side), side };
}

export async function fileToPhoto(file: File, opts: CropOptions = {}): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    return bitmapToPhoto(bitmap, opts);
  } finally {
    bitmap.close();
  }
}

export function bitmapToPhoto(bitmap: ImageBitmap | HTMLImageElement, opts: CropOptions = {}): string {
  const w = bitmap.width;
  const h = bitmap.height;
  const { sx, sy, side } = cropGeometry(w, h, opts);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
