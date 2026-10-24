import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };

// Plan v3: exactly two assets per image.
export const VARIANTS = ['full', 'thumb'] as const;
export type Variant = (typeof VARIANTS)[number];

// No file extension in the public ID: Cloudinary keeps the uploaded format.
export const publicIdFor = (id: string, variant: Variant): string => `photos/${id}/${variant}`;

/**
 * Signed delivery URL for an `authenticated` asset. Pure local hashing with the API secret:
 * no Cloudinary API call, no credits.
 *
 * Deterministic on purpose (no timestamp, no expiry, no transformation), so the same asset
 * always yields the same URL and the browser cache keeps working.
 */
export const signedUrl = (id: string, variant: Variant): string =>
  cloudinary.url(publicIdFor(id, variant), {
    resource_type: 'image',
    type: 'authenticated',
    sign_url: true,
    secure: true,
  });
