import type { Role as ApprovedRole, User, UserRole } from "#features/auth"

export type Role = "Partner" | "Guest" | "Pending"

export type AdminUser = {
  id: string
  username: string
  nickname: string
  role: Role
  createdAt: string
  avatarUrl?: string
}

/** Roles an admin can hand out when approving a sign-up (`admin` is never assignable). */
export type ApprovableRole = Exclude<ApprovedRole, "admin">

/** An account waiting for approval (GET /api/admin/users/pending). */
export type PendingUser = User<"pending_approval"> & {
  /** ISO 8601 */
  createdAt: string
}

/**
 * An account as returned by GET /api/admin/users: every account except the
 * admin's, so `admin` never appears as a role here.
 */
export type ListedUser = User<Exclude<UserRole, "admin">> & {
  /** ISO 8601 */
  createdAt: string
}

/**
 * Body of PATCH /api/users/:id. Send at least one field. `username` can't be
 * changed. `role` is admin only, and only for partner and guest accounts
 * (pending accounts are approved instead; the admin's role is fixed).
 */
export type UpdateUserInput = {
  nickname?: string
  role?: ApprovableRole
  password?: string
  /**
   * Required only when changing your OWN password. An admin resetting
   * someone else's password doesn't send it.
   */
  currentPassword?: string
}

/**
 * The account as PATCH /api/users/:id returns it (no `createdAt`). Same roles
 * as ListedUser: the admin never appears in this list, and a pending account
 * stays pending when only its nickname changes.
 */
export type UpdatedUser = User<Exclude<UserRole, "admin">>
