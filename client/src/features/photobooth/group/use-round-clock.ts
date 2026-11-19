import { useEffect, useRef, useState } from "react"

import { useBoothSessionContext } from "../session/booth-session-context"
import type { BoothRound } from "../session/types"
import { captureAt } from "./round-timeline"

const TICK_MS = 100
/** A shot whose time passed this long ago is skipped (the tab was asleep): a late photo is a wrong photo. */
const LATE_GRACE_MS = 750

/**
 * The server's time, refreshed ten times a second while `active`. The countdown is not a counter
 * that is stepped once a second: it is worked out from this time on every render, so it can't
 * drift and every screen shows the same number.
 */
export function useServerNow(active: boolean): number {
  const { serverNow } = useBoothSessionContext()
  const [now, setNow] = useState(() => serverNow())

  useEffect(() => {
    if (!active) return
    setNow(serverNow())
    const id = window.setInterval(() => setNow(serverNow()), TICK_MS)
    return () => window.clearInterval(id)
  }, [active, serverNow])

  return now
}

type ShotSchedulerOptions = {
  round: BoothRound | null
  /** Only while this person can actually take photos (camera running, window open, in the round). */
  enabled: boolean
  /** Called at each shot's agreed moment. */
  onShot: (shot: number) => void
}

/**
 * Calls `onShot(i)` at the shared capture time of every remaining shot of a running round. The
 * timers are set from the server's clock, so every camera takes shot i at the same moment, give
 * or take the clock estimate's accuracy. The server has the last word: it accepts a still only
 * for shots inside the round.
 */
export function useShotScheduler({ round, enabled, onShot }: ShotSchedulerOptions) {
  const { serverNow } = useBoothSessionContext()

  const onShotRef = useRef(onShot)
  useEffect(() => {
    onShotRef.current = onShot
  })

  const running = round?.status === "running"
  const startAt = round?.startAt
  const firstShot = round?.firstShot
  const intervalMs = round?.intervalMs
  const shots = round?.shots

  useEffect(() => {
    if (
      !enabled ||
      !running ||
      startAt === undefined ||
      firstShot === undefined ||
      intervalMs === undefined ||
      shots === undefined
    ) {
      return
    }

    const timeline = { startAt, firstShot, intervalMs }
    const now = serverNow()
    const timers: number[] = []

    for (let shot = firstShot; shot < shots; shot += 1) {
      const delay = captureAt(timeline, shot) - now
      if (delay < -LATE_GRACE_MS) continue
      timers.push(
        window.setTimeout(() => onShotRef.current(shot), Math.max(0, delay)),
      )
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [enabled, running, startAt, firstShot, intervalMs, shots, serverNow])
}
