import { useState } from "react"
import { createPortal } from "react-dom"
import { CursorAnimator } from "../services/cursor-animator.ts"
import type { Peer } from "../types.ts"
import { RemoteCursor } from "./remote-cursor.tsx"

/**
 * Draws other people's cursors over the whole page and animates them. The caller keeps the list of
 * peers and updates `peer.pos` in place as they move (see Peer).
 */
export function CursorLayer({ peers }: { peers: readonly Peer[] }) {
  const [animator] = useState(() => new CursorAnimator())

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
