import bcrypt from 'bcryptjs';
import { User, toPublicUser, type PublicUser, type UserRole } from '../models/user';
import type { ApproveUserInput, UpdateUserInput } from '../validators/user';
import { BCRYPT_COST } from './auth';

export type PendingUser = PublicUser & { createdAt: Date };
export type ListedUser = PublicUser & { createdAt: Date };

/**
 * Every account except the admin, oldest first. There is only ever one admin (created with
 * `npm run create-admin`), and it is not managed through the API, so it is left out of the list.
 */
export async function listUsers(): Promise<ListedUser[]> {
  const users = await User.find({ role: { $nin: ['admin', 'pending_approval'] } })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  return users.map((u) => ({ ...toPublicUser(u), createdAt: u.createdAt }));
}

/** Pending accounts, oldest first. */
export async function listPendingUsers(): Promise<PendingUser[]> {
  const users = await User.find({ role: 'pending_approval' })
    .sort({ createdAt: 1 })
    .lean();
  return users.map((u) => ({ ...toPublicUser(u), createdAt: u.createdAt }));
}

/** Count pending accounts */
export async function countPendingUsers(): Promise<number> {
  const count = await User.countDocuments({ role: 'pending_approval' });
  return count;
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

export type UpdateUserResult =
  | { ok: true; user: PublicUser }
  | {
      ok: false;
      reason:
        | 'not_found'
        | 'incorrect_current_password'
        | 'admin_role_locked'
        | 'pending_role_locked';
    };

// Accounts whose role an admin may change. The admin is fixed, and pending accounts get their
// role by being approved, not edited.
const ROLE_EDITABLE: UserRole[] = ['partner', 'guest'];

/**
 * Updates nickname, password and/or role. The controller has already checked that only an admin
 * sends `role`.
 *
 * - verifyCurrentPassword: true when a user changes their own password; the stored hash must
 *   match currentPassword first.
 * - A role change goes through ONE atomic update whose filter only matches partner/guest accounts,
 *   so the admin can never be demoted and a pending account can never be approved through this
 *   route, whatever id is passed. When nothing is written, nothing else is either.
 */
export async function updateUser(
  id: string,
  { nickname, password, currentPassword, role }: UpdateUserInput,
  { verifyCurrentPassword }: { verifyCurrentPassword: boolean },
): Promise<UpdateUserResult> {
  const update: { nickname?: string; passwordHash?: string; role?: ApproveUserInput['role'] } = {};
  if (nickname !== undefined) update.nickname = nickname;
  if (role !== undefined) update.role = role;

  if (password !== undefined) {
    if (verifyCurrentPassword) {
      const existing = await User.findById(id).select('+passwordHash');
      if (!existing) return { ok: false, reason: 'not_found' };

      const matches =
        currentPassword !== undefined && (await bcrypt.compare(currentPassword, existing.passwordHash));
      if (!matches) return { ok: false, reason: 'incorrect_current_password' };
    }
    update.passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  }

  const filter = role === undefined ? { _id: id } : { _id: id, role: { $in: ROLE_EDITABLE } };
  const user = await User.findOneAndUpdate(filter, update, { new: true, runValidators: true });
  if (user) return { ok: true, user: toPublicUser(user) };

  // Nothing matched. Without a role change that can only mean the account doesn't exist.
  if (role === undefined) return { ok: false, reason: 'not_found' };

  const existing = await User.findById(id).select('role').lean();
  if (!existing) return { ok: false, reason: 'not_found' };
  return { ok: false, reason: existing.role === 'admin' ? 'admin_role_locked' : 'pending_role_locked' };
}
