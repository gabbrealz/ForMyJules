import { ANCHOR_ATTRIBUTE } from "../anchors.ts"
import { ANCHOR_NAME_PATTERN } from "../constants.ts"
import type { CursorPos } from "../types.ts"
import { toFraction } from "../utils.ts"

// The only place that reads layout. Positions travel as fractions, so these two
// functions are what turn a pointer into fractions and fractions back into pixels.

function pageSize() {
  const root = document.documentElement
  return {
    width: Math.max(root.scrollWidth, 1),
    height: Math.max(root.scrollHeight, 1),
  }
}

/** Box of the named anchor, or null if it's missing or hidden (e.g. `display: none` on mobile). */
function anchorRect(name: string): DOMRect | null {
  const element = document.querySelector(`[${ANCHOR_ATTRIBUTE}="${name}"]`)
  if (!element) return null
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 ? rect : null
}

/** Pointer (viewport pixels) -> fractions within the closest anchor, plus page-level fallback fractions. */
export function measurePointer(clientX: number, clientY: number): CursorPos {
  const { width, height } = pageSize()
  const fx = toFraction((clientX + window.scrollX) / width)
  const fy = toFraction((clientY + window.scrollY) / height)

  const anchor = document
    .elementFromPoint(clientX, clientY)
    ?.closest(`[${ANCHOR_ATTRIBUTE}]`)
  const name = anchor?.getAttribute(ANCHOR_ATTRIBUTE)

  if (anchor && name && ANCHOR_NAME_PATTERN.test(name)) {
    const rect = anchor.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      return {
        a: name,
        x: toFraction((clientX - rect.left) / rect.width),
        y: toFraction((clientY - rect.top) / rect.height),
        fx,
        fy,
      }
    }
  }
  return { a: null, fx, fy }
}

/** Position from a peer (fractions) -> viewport pixels on this screen. Falls back to page-level when the anchor isn't here. */
export function resolveTarget(pos: CursorPos): { x: number; y: number } {
  if (pos.a !== null) {
    const rect = anchorRect(pos.a)
    if (rect) {
      return {
        x: rect.left + pos.x * rect.width,
        y: rect.top + pos.y * rect.height,
      }
    }
  }
  const { width, height } = pageSize()
  return {
    x: pos.fx * width - window.scrollX,
    y: pos.fy * height - window.scrollY,
  }
}
