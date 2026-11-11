import { useState } from "react"
import { createPortal } from "react-dom"
import { useRequiredUser } from "#features/auth"
import { useSocketConnection } from "#hooks/use-socket-connection"
import { useCursorBroadcast } from "../hooks/use-cursor-broadcast.ts"
import { useRemotePeers } from "../hooks/use-remote-peers.ts"
import { CursorAnimator } from "../services/cursor-animator.ts"
import { canUseLiveCursor } from "../utils.ts"
import { RemoteCursor } from "./remote-cursor.tsx"

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
  const [animator] = useState(() => new CursorAnimator())

  if (!allowed) return null

  // In a portal so no ancestor's transform or filter can break `fixed`.
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      {peers.map((peer) => (
        <RemoteCursor key={peer.id} peer={peer} animator={animator} />
      ))}
    </div>,
    document.body,
  )
}
