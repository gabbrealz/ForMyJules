import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { SESSION_COOKIE_NAME, cookieOptions } from '../config';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { User, toPublicUser } from '../models/user';
import { destroySession, regenerateSession, saveSession } from '../utils/session';
import { loginSchema, signUpSchema, type LoginInput, type SignUpInput } from '../validators/user';

const BCRYPT_COST = 12;

// Compared against when the username doesn't exist, so "unknown user" and "wrong password"
// take about the same time and can't be told apart by timing.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', BCRYPT_COST);

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;

const router = Router();

// POST /api/auth/signup   body: { username, nickname, password }
// Creates the account as "pending_approval". No session is created until an admin approves it.
router.post('/signup', validate('body', signUpSchema), async (req, res) => {
  const { username, nickname, password } = req.body as SignUpInput;

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const user = await User.create({ username, nickname, passwordHash, role: 'pending_approval' });
    res.status(201).json({
      message: 'Account created. An admin needs to approve it before you can log in.',
      user: toPublicUser(user),
    });
  } catch (err) {
    // The unique index is the source of truth, so two simultaneous signups can't both succeed.
    if (isDuplicateKeyError(err)) {
      res.status(409).json({ error: 'That username is already taken' });
      return;
    }
    throw err;
  }
});

// POST /api/auth/login   body: { username, password }
router.post('/login', validate('body', loginSchema), async (req, res) => {
  const { username, password } = req.body as LoginInput;

  const user = await User.findOne({ username }).select('+passwordHash');
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  // Only someone who proved they know the password gets told the account is pending.
  if (user.role === 'pending_approval') {
    res.status(403).json({
      error: 'Your account is waiting for admin approval',
      code: 'pending_approval',
    });
    return;
  }

  // New session id on login, which prevents session fixation.
  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);

  res.json({ user: toPublicUser(user) });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  res.status(204).end();
});

// GET /api/auth/me  -> the current user, or 401. Handy for the frontend on page load.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
