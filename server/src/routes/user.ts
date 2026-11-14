import { Router } from 'express';
import * as userController from '../controllers/user';
import { requireAuth, requireSelfOrAdmin } from '../middlewares/auth';
import { updateUserLimiter } from '../middlewares/rate-limit';
import { validate } from '../middlewares/validate';
import { updateUserSchema, userIdParamSchema } from '../validators/user';

const router = Router();

router.use(requireAuth);

// PATCH /api/users/:id   body: { nickname?, password?, currentPassword? }
// Admin: any account. Everyone else: only their own.
router.patch(
  '/:id',
  updateUserLimiter,
  requireSelfOrAdmin,
  validate('params', userIdParamSchema),
  validate('body', updateUserSchema),
  userController.updateUser,
);

export default router;
