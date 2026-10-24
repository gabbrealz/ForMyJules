import { rateLimit } from 'express-rate-limit';

// Keyed by user id, so use these AFTER requireAuth. In-memory: counters reset when Render
// restarts the instance, which is fine for an abuse guard on a two-person app.
const perUser = (limit: number, windowMs: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? 'anonymous',
    handler: (_req, res) => {
      res.status(429).json({ error: 'Too many requests. Please slow down.', code: 'rate_limited' });
    },
  });

// One call per photo being uploaded. 200 per 15 minutes leaves room for a big batch import.
export const signUploadLimiter = perUser(200, 15 * 60 * 1000);

// Each save makes one Cloudinary Admin API call, so cap it too (separate counter from signing).
export const createPhotoLimiter = perUser(200, 15 * 60 * 1000);
