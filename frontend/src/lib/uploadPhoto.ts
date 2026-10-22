// client/src/lib/uploadPhoto.ts  (React + TypeScript, runs in the browser)
// npm i thumbhash exifr
import { rgbaToThumbHash } from 'thumbhash';
import exifr from 'exifr';

const API = import.meta.env.VITE_API_URL as string;

type Signed = {
  public_id: string;
  type: string;
  overwrite: string;
  timestamp: string;
  signature: string;
};
type SignResponse = {
  id: string;
  cloudName: string;
  apiKey: string;
  uploads: { full: Signed; thumb: Signed; original?: Signed };
};

// Resize so the longest edge is at most maxEdge, then encode as WebP.
async function encode(bitmap: ImageBitmap, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  let blob = await canvas.convertToBlob({ type: 'image/webp', quality });
  // Some browsers (older Safari) can't encode WebP and silently return another type.
  if (blob.type !== 'image/webp') blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return { blob, w, h };
}

// ThumbHash wants an image of at most 100x100 px. Returns base64 (~30 chars).
function makeThumbHash(bitmap: ImageBitmap): string {
  const scale = Math.min(1, 100 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = new OffscreenCanvas(w, h).getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return btoa(String.fromCharCode(...rgbaToThumbHash(w, h, data)));
}

// Direct upload to Cloudinary using the signature the server issued.
async function uploadToCloudinary(file: Blob, s: Signed, cloudName: string, apiKey: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  // public_id, type, overwrite, timestamp, signature: must match what was signed
  for (const [key, value] of Object.entries(s)) form.append(key, value);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as { bytes: number };
}

export async function uploadPhoto(file: File, authToken: string, opts: { keepOriginal?: boolean } = {}) {
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };
  const bitmap = await createImageBitmap(file);

  try {
    // 1. Process in the browser. Re-encoding also strips EXIF/GPS from the stored copies.
    const [full, thumb, exif] = await Promise.all([
      encode(bitmap, 2048, 0.8),
      encode(bitmap, 400, 0.75),
      exifr.parse(file, ['DateTimeOriginal']).catch(() => null), // read the capture date before it's lost
    ]);
    const thumbhash = makeThumbHash(bitmap);
    const takenAt = (exif?.DateTimeOriginal as Date | undefined) ?? new Date(file.lastModified);

    // 2. Ask Express (authenticated) for signatures.
    const signRes = await fetch(`${API}/api/uploads/sign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ withOriginal: !!opts.keepOriginal }),
    });
    if (!signRes.ok) throw new Error(`Could not get upload signature (${signRes.status})`);
    const { id, cloudName, apiKey, uploads }: SignResponse = await signRes.json();

    // 3. Upload straight to Cloudinary. Render never touches the bytes.
    const [fullRes, thumbRes, originalRes] = await Promise.all([
      uploadToCloudinary(full.blob, uploads.full, cloudName, apiKey),
      uploadToCloudinary(thumb.blob, uploads.thumb, cloudName, apiKey),
      opts.keepOriginal && uploads.original
        ? uploadToCloudinary(file, uploads.original, cloudName, apiKey)
        : Promise.resolve(null),
    ]);

    // 4. Save metadata only after every upload succeeded.
    const metaRes = await fetch(`${API}/api/photos`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id,
        w: full.w,
        h: full.h,
        thumbhash,
        takenAt: takenAt.toISOString(),
        bytes: fullRes.bytes + thumbRes.bytes,
        hasOriginal: !!originalRes,
        originalBytes: originalRes?.bytes ?? null,
      }),
    });
    if (!metaRes.ok) throw new Error(`Saving photo metadata failed (${metaRes.status})`);
    return metaRes.json();
  } finally {
    bitmap.close();
  }
}
