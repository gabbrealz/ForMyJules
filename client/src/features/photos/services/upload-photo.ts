import { rgbaToThumbHash } from 'thumbhash';
import exifr from 'exifr';
import { photosApi } from './photos-api.ts';
import { uploadsApi } from './uploads-api.ts';
import type { Photo, PhotoKind, SignedUploadParams } from '../types.ts';

export type UploadPhotoOptions = {
  /**
   * Re-encode the full image as a downscaled WebP (default). Pass false to upload
   * the file as it is; it must then be a JPEG, PNG, WebP or GIF, and any EXIF/GPS
   * data it carries is kept.
   */
  compress?: boolean;
  /** Overrides the server default ("sticker" if the image has transparency, otherwise "photo"). */
  kind?: PhotoKind;
  signal?: AbortSignal;
};

const MAX_FULL_EDGE = 2048;
const MAX_THUMB_EDGE = 400;
const SERVER_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Resize so the longest edge is at most maxEdge, then encode as WebP.
async function encode(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
  { allowJpegFallback }: { allowJpegFallback: boolean },
) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  let blob = await canvas.convertToBlob({ type: 'image/webp', quality });
  // Some browsers (older Safari) can't encode WebP and silently return another type.
  if (blob.type !== 'image/webp' && allowJpegFallback) {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  }
  return { blob, w, h };
}

// ThumbHash wants an image of at most 100x100 px. Returns base64 (~30 chars) and
// whether any sampled pixel is see-through.
function sample(bitmap: ImageBitmap): { thumbhash: string; hasAlpha: boolean } {
  const scale = Math.min(1, 100 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = new OffscreenCanvas(w, h).getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      hasAlpha = true;
      break;
    }
  }
  return { thumbhash: btoa(String.fromCharCode(...rgbaToThumbHash(w, h, data))), hasAlpha };
}

// Direct upload to Cloudinary using the signature the server issued.
async function uploadToCloudinary(
  file: Blob,
  signed: SignedUploadParams,
  cloudName: string,
  apiKey: string,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  // public_id, type, overwrite, timestamp, signature: must be sent exactly as signed
  for (const [key, value] of Object.entries(signed)) form.append(key, value);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status}): ${await res.text()}`);
}

function validDate(value: unknown): Date | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

// Typical flow (API.md): sign -> upload full + thumb to Cloudinary -> save metadata.
export async function uploadPhoto(file: File, opts: UploadPhotoOptions = {}): Promise<Photo> {
  const { compress = true, kind, signal } = opts;

  if (!compress && !SERVER_ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Uncompressed uploads must be JPEG, PNG, WebP or GIF.');
  }

  // createImageBitmap applies EXIF orientation, so these are the "stored" dimensions.
  const bitmap = await createImageBitmap(file);

  try {
    // 1. Process in the browser. Re-encoding also strips EXIF/GPS from the stored copies.
    const [full, thumb, exif] = await Promise.all([
      compress
        ? encode(bitmap, MAX_FULL_EDGE, 0.8, { allowJpegFallback: true })
        : Promise.resolve({ blob: file as Blob, w: bitmap.width, h: bitmap.height }),
      encode(bitmap, MAX_THUMB_EDGE, 0.75, { allowJpegFallback: false }),
      exifr.parse(file, ['DateTimeOriginal']).catch(() => null), // read the capture date before it's lost
    ]);

    // The API only accepts WebP thumbnails.
    if (thumb.blob.type !== 'image/webp') {
      throw new Error("This browser can't encode WebP images, which thumbnails require.");
    }

    const { thumbhash, hasAlpha } = sample(bitmap);
    const takenAt = validDate(exif?.DateTimeOriginal) ?? new Date(file.lastModified);

    // 2. Ask the server for signed Cloudinary params (and the photo id).
    const { id, cloudName, apiKey, uploads } = await uploadsApi.sign({ signal });

    // 3. Upload straight to Cloudinary. The API server never touches the bytes.
    await Promise.all([
      uploadToCloudinary(full.blob, uploads.full, cloudName, apiKey, signal),
      uploadToCloudinary(thumb.blob, uploads.thumb, cloudName, apiKey, signal),
    ]);

    // 4. Save the metadata once BOTH uploads have finished.
    return await photosApi.create(
      {
        id,
        kind,
        w: full.w,
        h: full.h,
        origW: bitmap.width,
        origH: bitmap.height,
        thumbhash,
        // A JPEG fallback has no alpha channel, so don't claim one.
        hasAlpha: hasAlpha && full.blob.type !== 'image/jpeg',
        compressed: compress && full.blob.type === 'image/webp',
        origBytes: file.size,
        takenAt: takenAt.toISOString(),
      },
      { signal },
    );
  } finally {
    bitmap.close();
  }
}
