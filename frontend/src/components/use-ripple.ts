import {
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react"

// Material 3 ripple values. Same numbers as the Button component.
const RIPPLE_OPACITY = 0.16 // peak opacity (the ripple uses currentColor)
const RIPPLE_GROW_MS = 450 // time to reach full size
const RIPPLE_FADE_MS = 350 // fade-out after release
const RIPPLE_MIN_PRESS_MS = 225 // quick taps still show the ripple this long
const RIPPLE_EASING = "cubic-bezier(0.2, 0, 0, 1)" // MD3 emphasized decelerate

/**
 * Spawns a ripple inside `host` and returns a `release` function.
 * The circle grows from the press point to the farthest corner, holds while
 * the pointer/key is down, then fades out. Omit the coordinates to ripple
 * from the center.
 */
export function startRipple(
  host: HTMLElement,
  clientX?: number,
  clientY?: number
): () => void {
  const noop = () => {}

  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return noop
  }

  const ripple = document.createElement("span")
  if (typeof ripple.animate !== "function") return noop

  const rect = host.getBoundingClientRect()
  const x = clientX === undefined ? rect.width / 2 : clientX - rect.left
  const y = clientY === undefined ? rect.height / 2 : clientY - rect.top
  const radius = Math.hypot(
    Math.max(x, rect.width - x),
    Math.max(y, rect.height - y)
  )

  Object.assign(ripple.style, {
    position: "absolute",
    left: `${x - radius}px`,
    top: `${y - radius}px`,
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    borderRadius: "9999px",
    backgroundColor: "currentColor",
    opacity: String(RIPPLE_OPACITY),
    pointerEvents: "none",
    willChange: "transform, opacity",
  })
  host.appendChild(ripple)

  ripple.animate([{ transform: "scale(0.3)" }, { transform: "scale(1)" }], {
    duration: RIPPLE_GROW_MS,
    easing: RIPPLE_EASING,
    fill: "forwards",
  })

  const startedAt = performance.now()
  let released = false

  return () => {
    if (released) return
    released = true

    const wait = Math.max(
      0,
      RIPPLE_MIN_PRESS_MS - (performance.now() - startedAt)
    )
    window.setTimeout(() => {
      const fade = ripple.animate(
        [{ opacity: RIPPLE_OPACITY }, { opacity: 0 }],
        { duration: RIPPLE_FADE_MS, easing: "linear", fill: "forwards" }
      )
      fade.onfinish = () => ripple.remove()
      fade.oncancel = () => ripple.remove()
    }, wait)
  }
}

const isInert = (el: HTMLElement) =>
  el.matches(":disabled, [aria-disabled='true'], [data-disabled]")

type UseRippleOptions = {
  /** Keys that start a centered ripple. Use ["Enter"] for links. */
  keys?: readonly string[]
}

/**
 * Wires a ripple to an element.
 *
 * - Render an empty, absolutely positioned, `overflow-hidden` span somewhere
 *   inside the element and attach `layerRef` to it. Ripples are drawn in it.
 * - Spread `handlers` onto the element.
 */
export function useRipple<T extends HTMLElement = HTMLElement>({
  keys = ["Enter", " "],
}: UseRippleOptions = {}) {
  const layerRef = useRef<HTMLSpanElement>(null)
  const releaseKeyRippleRef = useRef<(() => void) | null>(null)

  const endKeyRipple = () => {
    releaseKeyRippleRef.current?.()
    releaseKeyRippleRef.current = null
  }

  const handlers = {
    onPointerDown(event: PointerEvent<T>) {
      const host = event.currentTarget
      const layer = layerRef.current
      if (!layer || event.button !== 0 || isInert(host)) return

      const release = startRipple(layer, event.clientX, event.clientY)

      // Hold the ripple until the pointer lifts, leaves, or is cancelled.
      const endEvents = ["pointerup", "pointerleave", "pointercancel"] as const
      const done = () => {
        endEvents.forEach((name) => host.removeEventListener(name, done))
        release()
      }
      endEvents.forEach((name) => host.addEventListener(name, done))
    },

    onKeyDown(event: KeyboardEvent<T>) {
      const layer = layerRef.current
      if (
        !layer ||
        event.repeat ||
        event.target !== event.currentTarget ||
        !keys.includes(event.key) ||
        isInert(event.currentTarget)
      ) {
        return
      }
      endKeyRipple()
      releaseKeyRippleRef.current = startRipple(layer) // from the center
    },

    onKeyUp(event: KeyboardEvent<T>) {
      if (keys.includes(event.key)) endKeyRipple()
    },

    onBlur(_event: FocusEvent<T>) {
      endKeyRipple()
    },
  }

  return { layerRef, handlers }
}
