import { useEffect, useState } from "react"

import { adminApi } from "../services/admin-api.ts"

const listeners = new Set<() => void>()

/** Tells every mounted `usePendingCount` to refetch (call after the pending set changes). */
export function invalidatePendingCount() {
  listeners.forEach((listener) => listener())
}

/**
 * The number of sign-ups waiting for approval, or `null` until it's known.
 * A failed fetch keeps the last known value: the badge is non-critical.
 */
export function usePendingCount() {
  const [count, setCount] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const refresh = () => setReloadKey((key) => key + 1)
    listeners.add(refresh)
    return () => {
      listeners.delete(refresh)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    adminApi.getPendingCount({ signal: controller.signal }).then(
      (next) => {
        if (!controller.signal.aborted) setCount(next)
      },
      () => {
        // Keep the previous value; nothing to surface for a badge.
      }
    )
    return () => controller.abort()
  }, [reloadKey])

  return count
}
