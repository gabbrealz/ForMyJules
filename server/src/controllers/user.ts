import type { RequestHandler } from 'express';
import * as userService from '../services/user';
import type { UpdateUserInput } from '../validators/user';

export const updateUser: RequestHandler<{ id: string }> = async (req, res) => {
  const targetId = req.params.id.toLowerCase();
  const input = req.body as UpdateUserInput;
  const isSelf = req.user?.id === targetId;

  // Only the admin can change roles. Everyone else may edit nickname and password.
  if (input.role !== undefined && req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Only an admin can change roles', code: 'forbidden' });
    return;
  }

  // Changing your own password requires the current one. An admin resetting someone else's doesn't.
  const verifyCurrentPassword = isSelf && input.password !== undefined;
  if (verifyCurrentPassword && input.currentPassword === undefined) {
    res.status(400).json({
      error: 'Validation failed',
      details: [
        {
          field: 'currentPassword',
          message: 'Current password is required to change your own password',
        },
      ],
    });
    return;
  }

  const result = await userService.updateUser(targetId, input, { verifyCurrentPassword });

  if (!result.ok) {
    if (result.reason === 'incorrect_current_password') {
      // 403, not 401: the frontend likely treats 401 as "session expired" and logs out.
      res
        .status(403)
        .json({ error: 'Current password is incorrect', code: 'incorrect_current_password' });
      return;
    }
    if (result.reason === 'admin_role_locked') {
      res
        .status(403)
        .json({ error: "The admin's role can't be changed", code: 'cannot_change_admin_role' });
      return;
    }
    if (result.reason === 'pending_role_locked') {
      res.status(409).json({
        error: 'Pending accounts get their role when they are approved',
        code: 'pending_account',
      });
      return;
    }
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user: result.user });
};
