// server/routes/uploads.ts  (Node + Express, runs on Render)
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middlewares/auth'; // your existing session check

const API_SECRET = process.env.CLOUDINARY_API_SECRET!; // never sent to the browser

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: API_SECRET,
});

const router = Router();

// POST /api/uploads/sign   body: { withOriginal?: boolean }
// Returns one signature per file the browser is allowed to upload.
router.post('/uploads/sign', requireAuth, (req, res) => {
  const id = randomUUID(); // the server picks the ID; the client cannot choose or reuse one
  const timestamp = String(Math.round(Date.now() / 1000));
  const variants = ['full', 'thumb', ...(req.body?.withOriginal ? ['original'] : [])];

  const uploads = Object.fromEntries(
    variants.map((variant) => {
      // Every param the browser sends (except file and api_key) must be signed here,
      // with exactly the same values. Cloudinary re-computes the signature and rejects mismatches.
      const params = {
        public_id: `photos/${id}/${variant}`,
        type: 'authenticated', // only reachable later through signed URLs
        overwrite: 'false',    // an existing asset can never be replaced
        timestamp,
      };
      const signature = cloudinary.utils.api_sign_request(params, API_SECRET);
      return [variant, { ...params, signature }];
    }),
  );

  res.json({
    id,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY, // the API key is not secret; the API secret is
    uploads,
  });
});

export default router;

// In your app setup:  app.use(express.json());  app.use('/api', uploadsRouter);
