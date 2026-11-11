import type { AuthUser } from "#features/auth"
import { CURSOR_ROLES } from "./constants.ts"
import type { CursorPos } from "./types.ts"

export const canUseLiveCursor = (user: AuthUser) =>
  CURSOR_ROLES.includes(user.role)

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Clamps to [0, 1] and rounds to 4 decimals, which keeps messages small. */
export const toFraction = (value: number) =>
  Math.round(clamp01(value) * 10_000) / 10_000

/**
 * Share of the remaining distance to cover this frame. Because it depends on the
 * elapsed time, the motion feels the same at 60 Hz and 144 Hz.
 */
export const smoothingAlpha = (dtMs: number, tauMs: number) =>
  1 - Math.exp(-dtMs / tauMs)

/** Whether `next` differs enough from `prev` to be worth sending. */
export function hasMovedEnough(
  prev: CursorPos,
  next: CursorPos,
  minDelta: number,
): boolean {
  if (prev.a !== next.a) return true
  // Over an anchor, only the in-anchor position matters; otherwise the page one.
  if (prev.a !== null && next.a !== null) {
    return (
      Math.abs(prev.x - next.x) >= minDelta ||
      Math.abs(prev.y - next.y) >= minDelta
    )
  }
  return (
    Math.abs(prev.fx - next.fx) >= minDelta ||
    Math.abs(prev.fy - next.fy) >= minDelta
  )
}

/** Dark or white text, whichever reads better on a "#rrggbb" background. */
export function readableTextColor(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 150 ? "#1f2937" : "#ffffff"
}
