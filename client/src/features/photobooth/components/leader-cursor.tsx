import { useEffect, useMemo } from "react"

import { CursorLayer, usePointerBroadcast, type Peer } from "#features/live-cursor"

import { boothChannel } from "../session/booth-channel"
import { useBoothSessionContext } from "../session/booth-session-context"

const LEADER_CURSOR_COLOR = "#ff5d8f"

/**
 * The leader's live cursor. The leader shares their pointer; everyone else sees it, labelled
 * "<name> (leader)". It runs over the booth channel, not the live-cursor feature, so guests see it
 * too. Positions are relative to the `boothStage` anchor, so screens of different sizes line up.
 */
export function LeaderCursor() {
  const { state, isLeader, joinStatus } = useBoothSessionContext()

  const leader = state?.members.find((member) => member.id === state.leaderId)
  const leaderId = leader?.id ?? null
  const leaderName = leader?.name ?? null

  usePointerBroadcast({
    active: isLeader && joinStatus === "joined",
    send: (pos) => boothChannel.send({ f: "booth", t: "cursor", pos }),
    onLeave: () => {
      boothChannel.send({ f: "booth", t: "cursor-leave" })
    },
  })

  // The leader's own screen shows no cursor: only the others need one.
  const peer = useMemo<Peer | null>(() => {
    if (isLeader || leaderId === null || leaderName === null) return null
    return {
      id: leaderId,
      user: {
        name: `${leaderName} (leader)`,
        color: LEADER_CURSOR_COLOR,
        shape: "triangle",
      },
      pos: null,
    }
  }, [isLeader, leaderId, leaderName])

  useEffect(() => {
    if (!peer) return
    return boothChannel.subscribe((message) => {
      if (message.t === "cursor" && message.id === peer.id) {
        peer.pos = message.pos
      } else if (message.t === "cursor-leave" && message.id === peer.id) {
        peer.pos = null
      }
    })
  }, [peer])

  if (!peer) return null
  return <CursorLayer peers={[peer]} />
}
