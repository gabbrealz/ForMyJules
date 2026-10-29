import { randomUUID } from 'crypto';
import { config } from '../config';
import { VARIANTS, cloudinary, publicIdFor } from '../utils/cloudinary';

/**
 * Builds one signature per asset the browser uploads: `full` and `thumb` (plan v3).
 */
export function createUploadSignatures() {
  const id = randomUUID(); // the server picks the ID; the client cannot choose or reuse one
  const timestamp = String(Math.round(Date.now() / 1000));

  const uploads = Object.fromEntries(
    VARIANTS.map((variant) => {
      // Every param the browser sends (except file and api_key) must be signed here,
      // with exactly the same values. Cloudinary re-computes the signature and rejects mismatches.
      const params = {
        public_id: publicIdFor(id, variant),
        type: 'authenticated', // only reachable later through signed URLs
        overwrite: 'false', // an existing asset can never be replaced
        timestamp,
      };
      const signature = cloudinary.utils.api_sign_request(params, config.cloudinary.apiSecret);
      return [variant, { ...params, signature }];
    }),
  );

  return {
    id,
    cloudName: config.cloudinary.cloudName,
    apiKey: config.cloudinary.apiKey, // the API key is not secret; the API secret is
    uploads,
  };
}
