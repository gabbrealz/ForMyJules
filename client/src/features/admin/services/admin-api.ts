import { http, type RequestOptions } from "#services/http-client"
import type { AuthUser } from "#features/auth"
import type {
  ApprovableRole,
  ListedUser,
  PendingUser,
  UpdatedUser,
  UpdateUserInput,
} from "../types.ts"

// Every call needs a logged-in admin (403 otherwise), except updateUser, which
// uses the shared /api/users endpoint (admins may edit any account there).
export const adminApi = {
  /**
   * Every account except the admin's (partner, guest and pending), oldest
   * first. Not paginated.
   */
  async listUsers(opts?: RequestOptions): Promise<ListedUser[]> {
    const { users } = await http.get<{ users: ListedUser[] }>(
      "/api/admin/users",
      opts,
    )
    return users
  },

  /** Accounts waiting for approval, oldest first. */
  async listPendingUsers(opts?: RequestOptions): Promise<PendingUser[]> {
    const { users } = await http.get<{ users: PendingUser[] }>(
      "/api/admin/users/pending",
      opts,
    )
    return users
  },

  /** Number of accounts waiting for approval */
  async getPendingCount(options?: { signal?: AbortSignal }) {
    const { count } = await http.get<{ count: number }>(
      "/api/admin/users/pending/count",
      options,
    )
    return count
  },

  /**
   * Promotes a pending account to `partner` or `guest`.
   * Errors: 404 if there is no pending user with that id (e.g. already handled).
   */
  async approveUser(
    id: string,
    role: ApprovableRole,
    opts?: RequestOptions,
  ): Promise<AuthUser> {
    const { user } = await http.post<{ user: AuthUser }>(
      `/api/admin/users/${encodeURIComponent(id)}/approve`,
      { role },
      opts,
    )
    return user
  },

  /** Deletes a pending account (frees the username). 404 if it isn't pending. */
  rejectUser: (id: string, opts?: RequestOptions) =>
    http.post<void>(
      `/api/admin/users/${encodeURIComponent(id)}/reject`,
      undefined,
      opts,
    ),

  /**
   * Changes an account's nickname, role and/or password
   * `role` is admin only and applies to partner and guest accounts.
   */
  async updateUser(
    id: string,
    changes: UpdateUserInput,
    opts?: RequestOptions,
  ): Promise<UpdatedUser> {
    const { user } = await http.patch<{ user: UpdatedUser }>(
      `/api/users/${encodeURIComponent(id)}`,
      changes,
      opts,
    )
    return user
  },

  /**
   * Permanently deletes a partner, guest or pending account (can't be undone;
   * frees the username and ends their session).
   * Errors: 403 (`cannot_delete_self`) if it's the requesting admin's own
   * account, 404 if there is no deletable user with that id.
   */
  deleteUser: (id: string, opts?: RequestOptions) =>
    http.delete<void>(`/api/admin/users/${encodeURIComponent(id)}`, opts),
}
