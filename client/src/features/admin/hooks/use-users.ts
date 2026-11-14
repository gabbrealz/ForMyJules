import { useCallback, useEffect, useState } from "react"

import { HttpError } from "#services/http-client"
import { adminApi } from "../services/admin-api.ts"
import type { AdminUser, ListedUser, Role, UpdateUserInput } from "../types.ts"

const ROLE_LABELS: Record<ListedUser["role"], Role> = {
  partner: "Partner",
  guest: "Guest",
  pending_approval: "Pending",
}

const toAdminUser = (user: ListedUser): AdminUser => ({
  id: user.id,
  username: user.username,
  nickname: user.nickname,
  role: ROLE_LABELS[user.role],
  createdAt: user.createdAt
})

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/** Loads every account (except the admin's) and exposes update and delete. */
export function useUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  // Load errors only. Update and delete errors are thrown to the caller (the dialogs).
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    adminApi.listUsers({ signal: controller.signal }).then(
      (list) => {
        setUsers(list.map(toAdminUser))
        setError(null)
        setLoading(false)
      },
      (err) => {
        if (controller.signal.aborted) return
        setError(messageOf(err, "Couldn't load users."))
        setLoading(false)
      },
    )
    return () => controller.abort()
  }, [reloadKey])

  const reload = useCallback(() => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }, [])

  /**
   * Saves the changes, then updates the row in place. Rejects with the API's
   * error (e.g. 400 validation) so the caller can show it.
   */
  const updateUser = useCallback(
    async (user: AdminUser, changes: UpdateUserInput) => {
      try {
        const updated = await adminApi.updateUser(user.id, changes)
        setUsers((rows) =>
          rows.map((row) =>
            row.id === user.id
              ? {
                  ...row,
                  nickname: updated.nickname,
                  role: ROLE_LABELS[updated.role],
                }
              : row,
          ),
        )
      } catch (err) {
        // 404: it's gone (another admin deleted it), so drop the stale row,
        // but still tell the caller.
        if (err instanceof HttpError && err.status === 404) {
          setUsers((rows) => rows.filter((row) => row.id !== user.id))
        }
        throw err
      }
    },
    [],
  )

  /**
   * Deletes the account, then drops its row. Rejects with the API's error
   * (e.g. 403 when deleting yourself) so the caller can show it.
   */
  const deleteUser = useCallback(async (user: AdminUser) => {
    try {
      await adminApi.deleteUser(user.id)
    } catch (err) {
      // 404: already gone (another admin got there first), which is the outcome we wanted.
      if (!(err instanceof HttpError && err.status === 404)) throw err
    }
    setUsers((rows) => rows.filter((row) => row.id !== user.id))
  }, [])

  return { users, loading, error, reload, updateUser, deleteUser }
}
