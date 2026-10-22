import { Router } from 'express';
import * as authController from '../controllers/auth';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { loginSchema, signUpSchema } from '../validators/user';

const router = Router();

// POST /api/auth/signup   body: { username, nickname, password }
// Creates the account as "pending_approval". No session is created until an admin approves it.
router.post('/signup', validate('body', signUpSchema), authController.signUp);

// POST /api/auth/login   body: { username, password }
router.post('/login', validate('body', loginSchema), authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me  -> the current user, or 401. Handy for the frontend on page load.
router.get('/me', requireAuth, authController.me);

export default router;
