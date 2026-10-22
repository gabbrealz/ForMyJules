import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { User, toPublicUser } from '../models/user';
import { approveUserSchema, userIdParamSchema, type ApproveUserInput } from '../validators/user';

const router = Router();

router.use(requireAuth, requireAdmin);

// GET /api/admin/users/pending
router.get('/users/pending', async (_req, res) => {
  const users = await User.find({ role: 'pending_approval' }).sort({ createdAt: 1 }).lean();
  res.json({ users: users.map((u) => ({ ...toPublicUser(u), createdAt: u.createdAt })) });
});

// POST /api/admin/users/:id/approve   body: { role: "partner" | "guest" }
// The filter includes role: 'pending_approval' so this can only ever promote pending accounts.
router.post(
  '/users/:id/approve',
  validate('params', userIdParamSchema),
  validate('body', approveUserSchema),
  async (req, res) => {
    const { role } = req.body as ApproveUserInput;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'pending_approval' },
      { role },
      { new: true, runValidators: true },
    );

    if (!user) {
      res.status(404).json({ error: 'Pending user not found' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  },
);

// POST /api/admin/users/:id/reject  -> deletes the pending account (frees the username)
router.post('/users/:id/reject', validate('params', userIdParamSchema), async (req, res) => {
  const deleted = await User.findOneAndDelete({ _id: req.params.id, role: 'pending_approval' });

  if (!deleted) {
    res.status(404).json({ error: 'Pending user not found' });
    return;
  }
  res.status(204).end();
});

export default router;
