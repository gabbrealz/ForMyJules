import type { RequestHandler } from 'express';
import { SESSION_COOKIE_NAME, cookieOptions } from '../config';
import * as authService from '../services/auth';
import { destroySession, regenerateSession, saveSession } from '../utils/session';
import type { LoginInput, SignUpInput } from '../validators/user';

export const signUp: RequestHandler = async (req, res) => {
  const result = await authService.signUp(req.body as SignUpInput);

  if (!result.ok) {
    res.status(409).json({ error: 'That username is already taken' });
    return;
  }

  res.status(201).json({
    message: 'Account created. An admin needs to approve it before you can log in.',
    user: result.user,
  });
};

export const login: RequestHandler = async (req, res) => {
  const result = await authService.verifyCredentials(req.body as LoginInput);

  if (!result.ok) {
    if (result.reason === 'pending_approval') {
      res.status(403).json({
        error: 'Your account is waiting for admin approval',
        code: 'pending_approval',
      });
      return;
    }
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  // New session id on login, which prevents session fixation.
  await regenerateSession(req);
  req.session.userId = result.user.id;
  await saveSession(req);

  res.json({ user: result.user });
};

export const logout: RequestHandler = async (req, res) => {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  res.status(204).end();
};

// Expects requireAuth to have run, which sets req.user.
export const me: RequestHandler = (req, res) => {
  res.json({ user: req.user });
};
