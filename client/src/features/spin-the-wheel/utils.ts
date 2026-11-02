import type { Entry } from "./types"

export const TAU = Math.PI * 2

/** Modulo that always lands in [0, m), even for negative input. */
export const mod = (n: number, m: number) => ((n % m) + m) % m

export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

/** One entry per non-empty line. Duplicates are allowed. */
export function parseEntries(text: string): Entry[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label, index) => ({ id: `${index}-${label}`, label }))
}

export function entriesToText(entries: readonly Entry[]): string {
  return entries.map((entry) => entry.label).join("\n")
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = copy[i] as T
    const b = copy[j] as T
    copy[i] = b
    copy[j] = a
  }
  return copy
}

export function sortEntries(entries: readonly Entry[]): Entry[] {
  return [...entries].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, {
      sensitivity: "base",
      numeric: true,
    })
  )
}

/**
 * Geometry: slice i spans [i * step, (i + 1) * step) in the wheel's own frame,
 * measured clockwise from 3 o'clock. The pointer sits at 3 o'clock, so with the
 * wheel rotated by `rotation` it points at local angle (-rotation) mod TAU.
 */
export function indexAtPointer(rotation: number, count: number): number {
  const step = TAU / count
  return Math.min(count - 1, Math.floor(mod(-rotation, TAU) / step))
}

export interface SpinPlan {
  winnerIndex: number
  /** Total radians to add to the current rotation. */
  total: number
  /** Milliseconds. */
  duration: number
}

/**
 * Picks the winner up front (uniformly, so every entry is equally likely) and
 * works out how far to turn so that slice ends up under the pointer. The
 * landing spot is kept away from the slice edges so it never looks like a
 * near miss.
 */
export function planSpin(
  rotation: number,
  count: number,
  random: () => number = Math.random,
  reducedMotion = false
): SpinPlan {
  const step = TAU / count
  const winnerIndex = Math.floor(random() * count)
  const landing = (winnerIndex + 0.12 + random() * 0.76) * step
  const turns = reducedMotion ? 2 : 5 + Math.floor(random() * 3)
  const total = turns * TAU + mod(-landing - rotation, TAU)
  const duration = reducedMotion ? 1200 : 5000 + random() * 1500
  return { winnerIndex, total, duration }
}
