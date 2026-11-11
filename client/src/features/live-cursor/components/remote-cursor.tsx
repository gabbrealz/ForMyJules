import { useLayoutEffect, useRef } from "react"
import type { CursorAnimator } from "../services/cursor-animator.ts"
import type { Peer } from "../types.ts"
import { readableTextColor } from "../utils.ts"
import { CursorShapeIcon } from "./cursor-shape.tsx"

/**
 * One remote cursor. React renders only its static look (shape, colour, name);
 * the animator owns its transform, visibility and opacity from then on.
 */
export function RemoteCursor({
  peer,
  animator,
}: {
  peer: Peer
  animator: CursorAnimator
}) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    return element ? animator.register(peer, element) : undefined
  }, [animator, peer])

  const { user } = peer

  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 will-change-transform transition-opacity duration-500 motion-reduce:transition-none"
    >
      <CursorShapeIcon shape={user.shape} color={user.color} />
      <span
        className="absolute top-3 left-3 max-w-40 truncate rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-sm"
        style={{
          backgroundColor: user.color,
          color: readableTextColor(user.color),
        }}
      >
        {user.name}
      </span>
    </div>
  )
}
