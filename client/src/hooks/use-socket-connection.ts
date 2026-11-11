import { useEffect, useSyncExternalStore } from "react"
import { useAuth } from "#features/auth"
import { socket, type SocketStatus } from "#services/socket"

/**
 * Keeps the shared socket open while the calling component is mounted and
 * returns its status. Pass `enabled = false` to not hold the connection (e.g.
 * for a role that can't use the feature).
 *
 * If the server says the session is gone, this signs the person out, so
 * <ProtectedRoute /> sends them to /login instead of retrying forever.
 */
export function useSocketConnection(enabled = true): SocketStatus {
  const { logout } = useAuth()

  useEffect(() => (enabled ? socket.retain() : undefined), [enabled])
  useEffect(() => socket.onUnauthorized(() => void logout()), [logout])

  return useSyncExternalStore(socket.onStatusChange, socket.getStatus)
}
