import type { BoothRound } from "../session/types"

/**
 * The shared timeline, in SERVER time (see BoothRound). Shot i is captured at
 *   captureAt(i) = startAt + (i - firstShot + 1) * intervalMs
 * and its countdown runs from captureAt(i) - intervalMs to captureAt(i).
 * Everything here is pure: the caller says what time it is.
 */
export function captureAt(
  round: Pick<BoothRound, "startAt" | "firstShot" | "intervalMs">,
  shot: number,
): number {
  return round.startAt + (shot - round.firstShot + 1) * round.intervalMs
}

export type RoundProgress =
  /** Before startAt: the short lead-in. Shows the first shot's full countdown. */
  | { kind: "lead-in"; shot: number; secondsLeft: number }
  /** Counting down to `shot`. */
  | { kind: "counting"; shot: number; secondsLeft: number }
  /** Every shot's time has passed. */
  | { kind: "finished" }

/** Where a running round is at `now`. */
export function getRoundProgress(
  round: Pick<BoothRound, "startAt" | "firstShot" | "intervalMs" | "shots">,
  now: number,
): RoundProgress {
  const { startAt, firstShot, intervalMs, shots } = round

  if (now < startAt) {
    return {
      kind: "lead-in",
      shot: firstShot,
      secondsLeft: Math.ceil(intervalMs / 1000),
    }
  }

  const shot = firstShot + Math.floor((now - startAt) / intervalMs)
  if (shot >= shots) return { kind: "finished" }

  const left = captureAt(round, shot) - now
  return {
    kind: "counting",
    shot,
    secondsLeft: Math.max(1, Math.ceil(left / 1000)),
  }
}

/** The shots that exist: indexes 0..count-1. While running, every shot of the layout is expected. */
export function shotCount(round: BoothRound): number {
  return round.taken ?? round.shots
}
