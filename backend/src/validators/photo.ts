import { z } from 'zod';

export const PHOTO_KINDS = ['photo', 'graphic', 'sticker'] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export const DEFAULT_PAGE_SIZE = 40;
export const MAX_PAGE_SIZE = 100;

// What crypto.randomUUID() produces. Lowercase only: Cloudinary public IDs are case-sensitive.
const PHOTO_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const dimension = z.int().min(1).max(50_000);

// ThumbHash is ~25-35 bytes, sent as standard base64 (what btoa produces).
const thumbhashSchema = z
  .string()
  .min(8)
  .max(120)
  .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'thumbhash must be base64');

// POST /api/photos body.
// Not accepted from the client: fullFormat, fullBytes, thumbBytes. The server reads those from
// Cloudinary. zod strips unknown keys, so sending them anyway is harmless.
export const createPhotoSchema = z.object({
  id: z.string().regex(PHOTO_ID_REGEX, 'Invalid photo id'), // the id returned by /uploads/sign
  kind: z.enum(PHOTO_KINDS).optional(), // defaults to "sticker" if hasAlpha, else "photo"
  w: dimension, // stored dimensions, orientation applied
  h: dimension,
  origW: dimension,
  origH: dimension,
  thumbhash: thumbhashSchema,
  hasAlpha: z.boolean(),
  compressed: z.boolean(),
  origBytes: z.int().min(1).max(2 * 1024 ** 3),
  takenAt: z.iso
    .datetime({ offset: true })
    .nullish()
    .transform((value) => (value ? new Date(value) : undefined)),
});

// GET /api/photos query string.
export const listPhotosQuerySchema = z.object({
  cursor: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid cursor').optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  kind: z.enum(PHOTO_KINDS).optional(),
});

export type CreatePhotoInput = z.infer<typeof createPhotoSchema>;
export type ListPhotosQuery = z.infer<typeof listPhotosQuerySchema>;
