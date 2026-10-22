import type { RequestHandler } from 'express';
import * as userService from '../services/user';
import type { ApproveUserInput } from '../validators/user';

export const listPendingUsers: RequestHandler = async (_req, res) => {
  const users = await userService.listPendingUsers();
  res.json({ users });
};

// body: { role: "partner" | "guest" }
export const approveUser: RequestHandler = async (req, res) => {
  const { role } = req.body as ApproveUserInput;

  const user = await userService.approvePendingUser(req.params.id, role);

  if (!user) {
    res.status(404).json({ error: 'Pending user not found' });
    return;
  }
  res.json({ user });
};

export const rejectUser: RequestHandler = async (req, res) => {
  const deleted = await userService.rejectPendingUser(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'Pending user not found' });
    return;
  }
  res.status(204).end();
};
