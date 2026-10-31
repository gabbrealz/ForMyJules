import { useCallback, useEffect, useState } from "react"

import { HttpError } from "#services/http-client"
import { adminApi } from "../services/admin-api.ts"
import type { AdminUser, ListedUser, Role } from "../types.ts"

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
})

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/** Loads every account (except the admin's) and exposes delete. */
export function useUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  // Load errors only. Delete errors are thrown to the caller (the confirm dialog).
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
      }
    )
    return () => controller.abort()
  }, [reloadKey])

  const reload = useCallback(() => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }, [])

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

  return { users, loading, error, reload, deleteUser }
}
