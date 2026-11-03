import { useEffect } from "react"
import type { RefObject } from "react"
import { prefersReducedMotion } from "../services/motion"
import { TAU, mod } from "../utils"

/** One slow turn every 45 s, eased in over 1.5 s each time the drift starts. */
const IDLE_TURN_SECONDS = 45
const IDLE_EASE_IN_MS = 1500

interface UseIdleDriftOptions {
  /** Drift only while true; stopping it (e.g. a spin starts) cancels the loop. */
  enabled: boolean
  /** Current angle of the wheel; this hook advances it while enabled. */
  rotationRef: RefObject<number>
  /** Redraws the wheel at the current angle. */
  paint: () => void
}

/** Slowly turns the wheel while nothing else is happening. */
export function useIdleDrift({
  enabled,
  rotationRef,
  paint,
}: UseIdleDriftOptions) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return

    const startedAt = performance.now()
    let last = startedAt
    let frameId = 0

    const frame = (now: number) => {
      // Clamp so a long gap (e.g. a background tab) doesn't cause a jump.
      const dt = Math.min(now - last, 100) / 1000
      last = now
      const ease = Math.min(1, (now - startedAt) / IDLE_EASE_IN_MS)
      const step = (TAU / IDLE_TURN_SECONDS) * ease * dt
      rotationRef.current = mod(rotationRef.current + step, TAU)
      paint()
      frameId = requestAnimationFrame(frame)
    }

    frameId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameId)
  }, [enabled, rotationRef, paint])
}
