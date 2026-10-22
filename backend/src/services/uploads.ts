import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

const API_SECRET = process.env.CLOUDINARY_API_SECRET!; // never sent to the browser

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: API_SECRET,
});

/**
 * Builds one signature per file the browser is allowed to upload.
 */
export function createUploadSignatures({ withOriginal }: { withOriginal: boolean }) {
  const id = randomUUID(); // the server picks the ID; the client cannot choose or reuse one
  const timestamp = String(Math.round(Date.now() / 1000));
  const variants = ['full', 'thumb', ...(withOriginal ? ['original'] : [])];

  const uploads = Object.fromEntries(
    variants.map((variant) => {
      // Every param the browser sends (except file and api_key) must be signed here,
      // with exactly the same values. Cloudinary re-computes the signature and rejects mismatches.
      const params = {
        public_id: `photos/${id}/${variant}`,
        type: 'authenticated', // only reachable later through signed URLs
        overwrite: 'false', // an existing asset can never be replaced
        timestamp,
      };
      const signature = cloudinary.utils.api_sign_request(params, API_SECRET);
      return [variant, { ...params, signature }];
    }),
  );

  return {
    id,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY, // the API key is not secret; the API secret is
    uploads,
  };
}
