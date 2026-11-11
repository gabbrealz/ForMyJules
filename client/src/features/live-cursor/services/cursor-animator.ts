import {
  IDLE_AFTER_MS,
  IDLE_OPACITY,
  MAX_FRAME_DT_MS,
  SMOOTHING_TAU_MS,
} from "../constants.ts"
import type { CursorPos, Peer } from "../types.ts"
import { smoothingAlpha } from "../utils.ts"
import { resolveTarget } from "./dom-geometry.ts"

type Tracked = {
  peer: Peer
  el: HTMLElement
  /** What is drawn now (viewport pixels). */
  x: number
  y: number
  /** False until the first position: the cursor snaps there instead of gliding in from (0, 0). */
  placed: boolean
  shown: boolean
  faded: boolean
  transform: string
  lastPos: CursorPos | null
  lastMoveAt: number
}

/**
 * One requestAnimationFrame loop that moves every remote cursor, outside React.
 *
 * Each frame it recomputes the target from the anchor's current box, so scrolling
 * and resizing keep a cursor pinned to its content, then moves what is drawn a
 * fraction of the way there (exponential smoothing). The loop runs only while at
 * least one cursor is registered.
 */
export class CursorAnimator {
  private readonly tracked = new Map<number, Tracked>()
  private frame: number | null = null
  private lastTime = 0
  private reducedMotion: MediaQueryList | null = null

  /** Starts driving `el` from `peer.pos`. Returns the function that stops it. */
  register(peer: Peer, el: HTMLElement): () => void {
    el.style.visibility = "hidden" // until the first position arrives
    this.tracked.set(peer.id, {
      peer,
      el,
      x: 0,
      y: 0,
      placed: false,
      shown: false,
      faded: false,
      transform: "",
      lastPos: null,
      lastMoveAt: performance.now(),
    })
    this.start()

    return () => {
      // A newer registration for the same peer may have replaced this one.
      if (this.tracked.get(peer.id)?.el === el) this.tracked.delete(peer.id)
      if (this.tracked.size === 0) this.stop()
    }
  }

  private start(): void {
    if (this.frame !== null) return
    this.reducedMotion ??= window.matchMedia("(prefers-reduced-motion: reduce)")
    this.lastTime = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  private stop(): void {
    if (this.frame === null) return
    cancelAnimationFrame(this.frame)
    this.frame = null
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(now - this.lastTime, MAX_FRAME_DT_MS)
    this.lastTime = now
    // With reduced motion, jump straight to the target.
    const alpha = this.reducedMotion?.matches
      ? 1
      : smoothingAlpha(dt, SMOOTHING_TAU_MS)

    for (const tracked of this.tracked.values()) this.step(tracked, alpha, now)
    this.frame = requestAnimationFrame(this.tick)
  }

  private step(t: Tracked, alpha: number, now: number): void {
    const { pos } = t.peer

    if (!pos) {
      if (t.shown) {
        t.el.style.visibility = "hidden"
        t.shown = false
        t.placed = false
      }
      return
    }

    if (pos !== t.lastPos) {
      t.lastPos = pos
      t.lastMoveAt = now
    }

    const target = resolveTarget(pos)
    if (t.placed) {
      t.x += (target.x - t.x) * alpha
      t.y += (target.y - t.y) * alpha
    } else {
      t.x = target.x
      t.y = target.y
      t.placed = true
    }

    const transform = `translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, 0)`
    if (transform !== t.transform) {
      t.transform = transform
      t.el.style.transform = transform
    }

    if (!t.shown) {
      t.el.style.visibility = "visible"
      t.shown = true
    }

    const faded = now - t.lastMoveAt > IDLE_AFTER_MS
    if (faded !== t.faded) {
      t.faded = faded
      t.el.style.opacity = faded ? String(IDLE_OPACITY) : "1"
    }
  }
}
