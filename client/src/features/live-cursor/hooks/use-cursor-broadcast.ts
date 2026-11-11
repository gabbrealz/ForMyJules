import { useEffect } from "react"
import { MIN_DELTA, SEND_INTERVAL_MS } from "../constants.ts"
import { LEAVE_MESSAGE, moveMessage } from "../protocol.ts"
import { cursorChannel } from "../services/cursor-channel.ts"
import { measurePointer } from "../services/dom-geometry.ts"
import type { CursorPos } from "../types.ts"
import { hasMovedEnough } from "../utils.ts"

/**
 * Sends this person's pointer position to the others while `active`.
 *
 * - Capture is free: pointer events only store the latest raw coordinates.
 * - Send is gated: at most one message per SEND_INTERVAL_MS, always the newest.
 *   Layout is read only at that point, not per event.
 * - Send on change: nothing is sent while the pointer is still, and no frame
 *   loop runs while idle.
 *
 * Pass `active = false` whenever the socket isn't open. When it turns true again
 * the last-sent position is forgotten, so the first move after a reconnect is sent.
 */
export function useCursorBroadcast(active: boolean): void {
  useEffect(() => {
    if (!active) return

    let pointer: { x: number; y: number } | null = null
    let dirty = false
    let frame: number | null = null
    let lastSentAt = 0
    let lastSent: CursorPos | null = null
    let visibleToOthers = false

    const flush = (now: number) => {
      frame = null
      if (!dirty || !pointer) return

      if (now - lastSentAt < SEND_INTERVAL_MS) {
        frame = requestAnimationFrame(flush) // too soon: wait for the next frame
        return
      }

      dirty = false
      const pos = measurePointer(pointer.x, pointer.y)
      if (lastSent && !hasMovedEnough(lastSent, pos, MIN_DELTA)) return

      if (cursorChannel.send(moveMessage(pos))) {
        lastSent = pos
        lastSentAt = now
        visibleToOthers = true
      }
    }

    const schedule = () => {
      dirty = true
      frame ??= requestAnimationFrame(flush)
    }

    const leave = () => {
      pointer = null
      dirty = false
      lastSent = null
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      if (visibleToOthers) {
        cursorChannel.send(LEAVE_MESSAGE)
        visibleToOthers = false
      }
    }

    const onPointer = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY }
      schedule()
    }
    // The content moved under a still pointer, so the position within it changed.
    const onLayoutChange = () => {
      if (pointer) schedule()
    }
    // A finger lifting means the cursor is gone; a mouse button coming up doesn't.
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === "touch") leave()
    }
    const onVisibilityChange = () => {
      if (document.hidden) leave()
    }

    const root = document.documentElement
    window.addEventListener("pointermove", onPointer, { passive: true })
    window.addEventListener("pointerdown", onPointer, { passive: true })
    window.addEventListener("pointerup", onPointerEnd)
    window.addEventListener("pointercancel", onPointerEnd)
    // Capture phase: scroll doesn't bubble, and the page may scroll inside a container.
    window.addEventListener("scroll", onLayoutChange, {
      capture: true,
      passive: true,
    })
    window.addEventListener("resize", onLayoutChange)
    root.addEventListener("pointerleave", leave)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.removeEventListener("pointermove", onPointer)
      window.removeEventListener("pointerdown", onPointer)
      window.removeEventListener("pointerup", onPointerEnd)
      window.removeEventListener("pointercancel", onPointerEnd)
      window.removeEventListener("scroll", onLayoutChange, { capture: true })
      window.removeEventListener("resize", onLayoutChange)
      root.removeEventListener("pointerleave", leave)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      // The connection may outlive this page, so don't leave a ghost cursor behind.
      leave()
    }
  }, [active])
}
