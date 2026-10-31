import type { Role as ApprovedRole, User, UserRole } from "#features/auth"

export type Role = "Partner" | "Guest" | "Pending"

export type AdminUser = {
  id: string
  username: string
  nickname: string
  role: Role
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
