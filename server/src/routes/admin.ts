import { Router } from 'express';
import * as adminController from '../controllers/admin';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { approveUserSchema, userIdParamSchema } from '../validators/user';

const router = Router();

router.use(requireAuth, requireAdmin);

// GET /api/admin/users/pending
router.get('/users/pending', adminController.listPendingUsers);

// POST /api/admin/users/:id/approve   body: { role: "partner" | "guest" }
router.post(
  '/users/:id/approve',
  validate('params', userIdParamSchema),
  validate('body', approveUserSchema),
  adminController.approveUser,
);

// POST /api/admin/users/:id/reject  -> deletes the pending account (frees the username)
router.post('/users/:id/reject', validate('params', userIdParamSchema), adminController.rejectUser);

export default router;
