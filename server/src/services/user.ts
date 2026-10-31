import { User, toPublicUser, type PublicUser } from '../models/user';
import type { ApproveUserInput } from '../validators/user';

export type PendingUser = PublicUser & { createdAt: Date };
export type ListedUser = PublicUser & { createdAt: Date };

/**
 * Every account except the admin, oldest first. There is only ever one admin (created with
 * `npm run create-admin`), and it is not managed through the API, so it is left out of the list.
 */
export async function listUsers(): Promise<ListedUser[]> {
  const users = await User.find({ role: { $ne: 'admin' } })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  return users.map((u) => ({ ...toPublicUser(u), createdAt: u.createdAt }));
}

/** Pending accounts, oldest first. */
export async function listPendingUsers(): Promise<PendingUser[]> {
  const users = await User.find({ role: 'pending_approval' }).sort({ createdAt: 1 }).lean();
  return users.map((u) => ({ ...toPublicUser(u), createdAt: u.createdAt }));
}

/**
 * Promotes a pending account to the given role. Returns null if there is no such pending user.
 * The filter includes role: 'pending_approval' so this can only ever promote pending accounts.
 */
export async function approvePendingUser(
  id: string,
  role: ApproveUserInput['role'],
): Promise<PublicUser | null> {
  const user = await User.findOneAndUpdate(
    { _id: id, role: 'pending_approval' },
    { role },
    { new: true, runValidators: true },
  );
  return user ? toPublicUser(user) : null;
}

/**
 * Deletes a pending account (frees the username). Returns false if there is no such pending user.
 */
export async function rejectPendingUser(id: string): Promise<boolean> {
  const deleted = await User.findOneAndDelete({ _id: id, role: 'pending_approval' });
  return deleted !== null;
}

/**
 * Deletes a non-admin account (frees the username). Returns false if there is no such user.
 * The filter excludes role: 'admin' so this can never remove the admin, whatever id is passed.
 */
export async function deleteUser(id: string): Promise<boolean> {
  const deleted = await User.findOneAndDelete({ _id: id, role: { $ne: 'admin' } });
  return deleted !== null;
}
