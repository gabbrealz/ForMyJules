import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { getSliceColor } from "../constants"
import { prefersReducedMotion } from "../services/motion"
import type { Entry, SpinResult } from "../types"
import { TAU, easeOutQuart, indexAtPointer, mod, planSpin } from "../utils"

interface UseWheelSpinOptions {
  entries: Entry[]
  /** Current angle of the wheel; this hook advances it while spinning. */
  rotationRef: RefObject<number>
  /** Redraws the wheel at the current angle. */
  paint: () => void
  onSpinStart?: () => void
  onSpinEnd?: (result: SpinResult) => void
  /** Called each time a slice edge passes the pointer. */
  onTick?: () => void
}

/** Minimum gap between ticks, so a fast-moving wheel doesn't fire every frame. */
const TICK_INTERVAL_MS = 40

export function useWheelSpin({
  entries,
  rotationRef,
  paint,
  onSpinStart,
  onSpinEnd,
  onTick,
}: UseWheelSpinOptions) {
  const [spinning, setSpinning] = useState(false)
  const spinningRef = useRef(false)
  const frameRef = useRef(0)
  // Always the latest props, so a spin that is already running sees them.
  const latest = useRef({ entries, onSpinStart, onSpinEnd, onTick })

  useEffect(() => {
    latest.current = { entries, onSpinStart, onSpinEnd, onTick }
  })

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const spin = useCallback(() => {
    const list = latest.current.entries
    if (spinningRef.current || list.length === 0) return

    const start = rotationRef.current
    const { winnerIndex, total, duration } = planSpin(
      start,
      list.length,
      Math.random,
      prefersReducedMotion()
    )

    spinningRef.current = true
    setSpinning(true)
    latest.current.onSpinStart?.()

    const startedAt = performance.now()
    let lastIndex = indexAtPointer(start, list.length)
    let lastTick = 0

    const frame = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration)
      rotationRef.current = start + total * easeOutQuart(t)
      paint()

      const index = indexAtPointer(rotationRef.current, list.length)
      if (index !== lastIndex) {
        lastIndex = index
        if (now - lastTick > TICK_INTERVAL_MS) {
          lastTick = now
          latest.current.onTick?.()
        }
      }

      if (t < 1) {
        frameRef.current = requestAnimationFrame(frame)
        return
      }

      rotationRef.current = mod(rotationRef.current, TAU)
      spinningRef.current = false
      setSpinning(false)
      const entry = list[winnerIndex]
      if (entry) {
        latest.current.onSpinEnd?.({
          entry,
          index: winnerIndex,
          color: getSliceColor(winnerIndex, list.length),
        })
      }
    }

    frameRef.current = requestAnimationFrame(frame)
  }, [paint, rotationRef])

  return { spinning, spin }
}
