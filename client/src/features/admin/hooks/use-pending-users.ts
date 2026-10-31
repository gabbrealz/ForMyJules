import { useCallback, useEffect, useState } from "react"

import { HttpError } from "#services/http-client"
import { adminApi } from "../services/admin-api.ts"
import type { AdminUser, ApprovableRole, PendingUser } from "../types.ts"

const toAdminUser = (user: PendingUser): AdminUser => ({
  id: user.id,
  username: user.username,
  nickname: user.nickname,
  role: "Pending",
})

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/** Loads the sign-ups waiting for approval and exposes approve / reject. */
export function usePendingUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Ids with a request in flight, so a row can't be actioned twice.
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set())
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    adminApi.listPendingUsers({ signal: controller.signal }).then(
      (pending) => {
        setUsers(pending.map(toAdminUser))
        setError(null)
        setLoading(false)
      },
      (err) => {
        if (controller.signal.aborted) return
        setError(messageOf(err, "Couldn't load pending registrations."))
        setLoading(false)
      }
    )
    return () => controller.abort()
  }, [reloadKey])

  const reload = useCallback(() => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }, [])

  const act = useCallback(
    async (id: string, request: () => Promise<unknown>, fallback: string) => {
      setError(null)
      setBusyIds((ids) => new Set(ids).add(id))
      const removeRow = () =>
        setUsers((rows) => rows.filter((row) => row.id !== id))
      try {
        await request()
        removeRow()
      } catch (err) {
        // 404: it's no longer pending (another admin got there first), so drop the row.
        if (err instanceof HttpError && err.status === 404) removeRow()
        setError(messageOf(err, fallback))
      } finally {
        setBusyIds((ids) => {
          const next = new Set(ids)
          next.delete(id)
          return next
        })
      }
    },
    []
  )

  const approve = useCallback(
    (user: AdminUser, role: ApprovableRole) =>
      act(
        user.id,
        () => adminApi.approveUser(user.id, role),
        `Couldn't approve ${user.username}.`
      ),
    [act]
  )

  const reject = useCallback(
    (user: AdminUser) =>
      act(
        user.id,
        () => adminApi.rejectUser(user.id),
        `Couldn't reject ${user.username}.`
      ),
    [act]
  )

  return {
    users,
    loading,
    error,
    isBusy: (id: string) => busyIds.has(id),
    approve,
    reject,
    reload,
  }
}
