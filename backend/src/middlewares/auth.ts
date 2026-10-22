import type { RequestHandler } from 'express';
import { SESSION_COOKIE_NAME, cookieOptions } from '../config';
import { User, toPublicUser, type PublicUser } from '../models/user';
import { destroySession } from '../utils/session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

/**
 * Requires a logged-in, approved user. Sets req.user.
 *
 * The session only stores the user id; the user is re-loaded from MongoDB on every request,
 * so deleting an account, demoting it back to pending, or revoking admin takes effect immediately.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const userId = req.session.userId;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = await User.findById(userId).lean();

  if (!user || user.role === 'pending_approval') {
    await destroySession(req);
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  req.user = toPublicUser(user);
  next();
};

// Use after requireAuth: router.use(requireAuth, requireAdmin)
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
