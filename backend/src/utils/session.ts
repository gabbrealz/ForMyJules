import type { Request } from 'express';

// express-session's regenerate/save/destroy are callback-based; these wrap them for async/await.

export const regenerateSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });

export const saveSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

export const destroySession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
