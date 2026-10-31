import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

const tooManyRequests = (_req: Request, res: Response) => {
  res.status(429).json({ error: 'Too many requests. Please slow down.', code: 'rate_limited' });
};

// In-memory: counters reset when Render restarts the instance, which is fine for an abuse
// guard on a small app.

// Keyed by user id, so use these AFTER requireAuth.
const perUser = (limit: number, windowMs: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? 'anonymous',
    handler: tooManyRequests,
  });

// Keyed by client IP (the default key generator), for routes with no logged-in user yet.
// Relies on `trust proxy` being set in production so req.ip is the real client, not Render's proxy.
const perIp = (limit: number, windowMs: number, options: { skipSuccessfulRequests?: boolean } = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests,
    ...options,
  });

// One call per photo being uploaded. 200 per 15 minutes leaves room for a big batch import.
export const signUploadLimiter = perUser(200, 15 * 60 * 1000);

// Each save makes one Cloudinary Admin API call, so cap it too (separate counter from signing).
export const createPhotoLimiter = perUser(200, 15 * 60 * 1000);

// Each delete makes one Cloudinary Admin API call as well (separate counter again).
export const deletePhotoLimiter = perUser(200, 15 * 60 * 1000);

// Brute-force guard: 10 failed logins per IP per 15 minutes. Successful logins don't count.
export const loginLimiter = perIp(10, 15 * 60 * 1000, { skipSuccessfulRequests: true });

// Each signup runs a bcrypt hash and creates a row, so keep it slow: 5 per IP per hour.
export const signUpLimiter = perIp(5, 60 * 60 * 1000);
