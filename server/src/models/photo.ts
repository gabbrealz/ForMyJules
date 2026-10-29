import { Schema, model, type Types } from 'mongoose';
import { PHOTO_KINDS, type PhotoKind } from '../validators/photo';

export const FULL_FORMATS = ['jpeg', 'png', 'webp', 'gif'] as const;
export type FullFormat = (typeof FULL_FORMATS)[number];

// ~0.5 KB per document. Signed URLs are NOT stored; they are rebuilt from photoId on every response.
export interface IPhoto {
  photoId: string; // the id from /uploads/sign; Cloudinary public IDs are photos/{photoId}/full|thumb
  owner: Types.ObjectId;
  kind: PhotoKind;
  w: number; // stored dimensions, orientation applied
  h: number;
  origW: number;
  origH: number;
  thumbhash: string; // base64
  hasAlpha: boolean;
  compressed: boolean;
  fullFormat: FullFormat;
  origBytes: number;
  fullBytes: number;
  thumbBytes: number;
  takenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const positiveInt = { type: Number, required: true, min: 1, validate: Number.isInteger } as const;

const photoSchema = new Schema<IPhoto>(
  {
    // unique: also makes saving the same upload twice impossible
    photoId: { type: String, required: true, unique: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: [...PHOTO_KINDS], required: true },
    w: positiveInt,
    h: positiveInt,
    origW: positiveInt,
    origH: positiveInt,
    thumbhash: { type: String, required: true },
    hasAlpha: { type: Boolean, required: true },
    compressed: { type: Boolean, required: true },
    fullFormat: { type: String, enum: [...FULL_FORMATS], required: true },
    origBytes: positiveInt,
    fullBytes: positiveInt,
    thumbBytes: positiveInt,
    takenAt: { type: Date },
  },
  { timestamps: true },
);

// No extra index needed for pagination: the list route pages on _id (newest first), and the
// default _id index already covers that. _id is time-ordered, so it tracks createdAt.

export const Photo = model<IPhoto>('Photo', photoSchema);
