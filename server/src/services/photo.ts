import { Types } from 'mongoose';
import { FULL_FORMATS, Photo, type FullFormat, type IPhoto } from '../models/photo';
import { cloudinary, publicIdFor, signedUrl } from '../utils/cloudinary';
import type { CreatePhotoInput, ListPhotosQuery } from '../validators/photo';
import * as storageService from './storage';

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;

// What the API returns. Signed URLs are built here, per response; they are never stored.
export type PhotoDto = Pick<IPhoto, 'kind' | 'w' | 'h' | 'thumbhash' | 'hasAlpha' | 'createdAt'> & {
  id: string;
  takenAt: Date | null;
  thumbUrl: string;
  fullUrl: string;
};

type PhotoLike = Pick<
  IPhoto,
  'photoId' | 'kind' | 'w' | 'h' | 'thumbhash' | 'hasAlpha' | 'takenAt' | 'createdAt'
>;

function toPhotoDto(photo: PhotoLike): PhotoDto {
  return {
    id: photo.photoId,
    kind: photo.kind,
    w: photo.w,
    h: photo.h,
    thumbhash: photo.thumbhash,
    hasAlpha: photo.hasAlpha,
    takenAt: photo.takenAt ?? null,
    createdAt: photo.createdAt,
    thumbUrl: signedUrl(photo.photoId, 'thumb'),
    fullUrl: signedUrl(photo.photoId, 'full'),
  };
}

/** One page, newest first. Cursor = _id of the last item of the previous page. */
export async function listPhotos({ cursor, limit, kind }: ListPhotosQuery) {
  const docs = await Photo.find({
    ...(cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
    ...(kind ? { kind } : {}),
  })
    .select('photoId kind w h thumbhash hasAlpha takenAt createdAt')
    .sort({ _id: -1 })
    .limit(limit + 1) // one extra row tells us whether another page exists
    .lean();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const last = page[page.length - 1];

  return {
    photos: page.map(toPhotoDto),
    nextCursor: hasMore && last ? last._id.toString() : null,
  };
}

// --- saving metadata ---------------------------------------------------------------------

type CloudinaryResource = { public_id: string; format?: string; bytes?: number };

type Failure =
  | { ok: false; reason: 'already_saved' | 'assets_missing' }
  | { ok: false; reason: 'invalid_assets'; message: string };

export type CreatePhotoResult = { ok: true; photo: PhotoDto } | Failure;

const toFullFormat = (format: string | undefined): FullFormat | undefined => {
  const normalized = format === 'jpg' ? 'jpeg' : format; // Cloudinary reports JPEG as "jpg"
  return FULL_FORMATS.find((allowed) => allowed === normalized);
};

/**
 * Asks Cloudinary (Admin API, one call, no credits) what actually landed under this id.
 * That proves both uploads finished, and gives us the real sizes and format rather than
 * trusting numbers sent by the browser.
 */
async function inspectAssets(
  id: string,
): Promise<Failure | { ok: true; fullFormat: FullFormat; fullBytes: number; thumbBytes: number }> {
  const fullId = publicIdFor(id, 'full');
  const thumbId = publicIdFor(id, 'thumb');

  const result = (await cloudinary.api.resources_by_ids([fullId, thumbId], {
    resource_type: 'image',
    type: 'authenticated',
  })) as { resources?: CloudinaryResource[] };

  const resources = result.resources ?? [];
  const full = resources.find((r) => r.public_id === fullId);
  const thumb = resources.find((r) => r.public_id === thumbId);

  if (!full || !thumb) return { ok: false, reason: 'assets_missing' };

  const fullFormat = toFullFormat(full.format);
  if (!fullFormat) {
    return {
      ok: false,
      reason: 'invalid_assets',
      message: `Unsupported image format: ${full.format ?? 'unknown'}. Allowed: JPEG, PNG, WebP, GIF.`,
    };
  }
  if (thumb.format !== 'webp') {
    return { ok: false, reason: 'invalid_assets', message: 'The thumbnail must be a WebP image.' };
  }
  if (typeof full.bytes !== 'number' || typeof thumb.bytes !== 'number') {
    throw new Error('Cloudinary did not report asset sizes');
  }

  return { ok: true, fullFormat, fullBytes: full.bytes, thumbBytes: thumb.bytes };
}

/**
 * Saves metadata for an upload that has already finished. Call only after BOTH files are on
 * Cloudinary; this verifies that before writing anything.
 */
export async function createPhoto(ownerId: string, input: CreatePhotoInput): Promise<CreatePhotoResult> {
  const assets = await inspectAssets(input.id);
  if (!assets.ok) return assets;

  // Plan section 2: compressed output is always lossy WebP.
  if (input.compressed && assets.fullFormat !== 'webp') {
    return {
      ok: false,
      reason: 'invalid_assets',
      message: `Marked as compressed, but the stored file is ${assets.fullFormat}, not WebP.`,
    };
  }

  try {
    const photo = await Photo.create({
      photoId: input.id,
      owner: new Types.ObjectId(ownerId),
      kind: input.kind ?? (input.hasAlpha ? 'sticker' : 'photo'),
      w: input.w,
      h: input.h,
      origW: input.origW,
      origH: input.origH,
      thumbhash: input.thumbhash,
      hasAlpha: input.hasAlpha,
      compressed: input.compressed,
      fullFormat: assets.fullFormat,
      origBytes: input.origBytes,
      fullBytes: assets.fullBytes,
      thumbBytes: assets.thumbBytes,
      takenAt: input.takenAt,
    });

    storageService.recordUpload(assets.fullBytes + assets.thumbBytes);
    return { ok: true, photo: toPhotoDto(photo) };
  } catch (err) {
    if (isDuplicateKeyError(err)) return { ok: false, reason: 'already_saved' };

    // Plan section 4: if the insert fails, log the public IDs so they can be cleaned up.
    console.error(
      'Photo insert failed; these Cloudinary assets are orphaned:',
      publicIdFor(input.id, 'full'),
      publicIdFor(input.id, 'thumb'),
      err,
    );
    throw err;
  }
}
