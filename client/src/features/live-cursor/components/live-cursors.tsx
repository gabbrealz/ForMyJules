import { useRequiredUser } from "#features/auth"
import { useSocketConnection } from "#hooks/use-socket-connection"
import { useCursorBroadcast } from "../hooks/use-cursor-broadcast.ts"
import { useRemotePeers } from "../hooks/use-remote-peers.ts"
import { canUseLiveCursor } from "../utils.ts"
import { CursorLayer } from "./cursor-layer.tsx"

/**
 * Live cursors for the page it is mounted on: shares this person's pointer and
 * draws everyone else's. The socket stays open only while it is mounted, so only
 * people on the same page see each other.
 *
 * Mount it once per page, under <ProtectedRoute />, and mark the regions
 * cursors should be pinned to with `anchorProps` (see anchors.ts).
 */
export function LiveCursors() {
  const user = useRequiredUser()
  const allowed = canUseLiveCursor(user)

  const status = useSocketConnection(allowed)
  const connected = allowed && status === "open"

  useCursorBroadcast(connected)
  const peers = useRemotePeers(connected)

  if (!allowed) return null

  return <CursorLayer peers={peers} />
}
