import type { RequestHandler } from 'express';
import * as userService from '../services/user';
import type { ApproveUserInput } from '../validators/user';

export const listUsers: RequestHandler = async (_req, res) => {
  const users = await userService.listUsers();
  res.json({ users });
};

export const listPendingUsers: RequestHandler = async (_req, res) => {
  const users = await userService.listPendingUsers();
  res.json({ users });
};

// body: { role: "partner" | "guest" }
export const approveUser: RequestHandler<{ id: string }> = async (req, res) => {
  const { role } = req.body as ApproveUserInput;

  const user = await userService.approvePendingUser(req.params.id, role);

  if (!user) {
    res.status(404).json({ error: 'Pending user not found' });
    return;
  }
  res.json({ user });
};

export const rejectUser: RequestHandler<{ id: string }> = async (req, res) => {
  const deleted = await userService.rejectPendingUser(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'Pending user not found' });
    return;
  }
  res.status(204).end();
};

export const deleteUser: RequestHandler<{ id: string }> = async (req, res) => {
  // The service also refuses to delete an admin; this check just gives the admin a clear 403
  // instead of a 404. Lowercased because the id validator accepts uppercase hex, but
  // req.user.id is always lowercase.
  if (req.params.id.toLowerCase() === req.user?.id) {
    res.status(403).json({
      error: 'You cannot delete your own account',
      code: 'cannot_delete_self',
    });
    return;
  }

  const deleted = await userService.deleteUser(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(204).end();
};
