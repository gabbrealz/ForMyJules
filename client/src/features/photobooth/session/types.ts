// Wire protocol of the multiplayer photobooth. A copy of server/src/sockets/photobooth.types.ts:
// keep the two in sync.
//
// Text messages are JSON objects: { f: 'booth', t: <type>, ... }.
// Binary frames (stills) are [u16 header length][JSON header][image bytes].
//
// The server owns the session. It sends the FULL state (`state`) to every member on every
// change; clients never patch it, they only send requests and render what comes back.

export type BoothScene = "one-scene" | "separate-cells"

/** Mirrors the stepper: 1 layout, 2 experience, 3 photos, 4 frame. */
export type BoothStep = 1 | 2 | 3 | 4

/**
 * 'lobby': people are joining and nothing can be configured yet. The leader moves the group into
 * 'flow' (the four steps) with `begin`, once at least 2 people are present.
 */
export type BoothPhase = "lobby" | "flow"

export type BoothRole = "admin" | "partner" | "guest"

export type BoothImageMime = "image/png" | "image/webp" | "image/jpeg"

export type BoothConfig = {
  /** Layout id from LAYOUTS. Null until the leader picks one. */
  layoutId: string | null
  scene: BoothScene
  /** Interval id from INTERVALS. */
  intervalId: string
  /** Always true in 'one-scene' mode. */
  removeBackground: boolean
  /** Filter id from FILTERS. One filter, shared by everyone. */
  filterId: string
  /** Lowercase '#rrggbb'. */
  frameColor: string
}

export type BoothMember = {
  /** The id of this person's socket connection, used in signalling and on stills. Listed in JOIN ORDER (first = at the back). */
  id: number
  name: string
  role: BoothRole
  /** 'waiting' = joined during a round. */
  status: "active" | "waiting"
  ready: boolean
}

/**
 * The shared timeline, in SERVER time. Shot i (firstShot <= i < shots) is captured at
 *   captureAt(i) = startAt + (i - firstShot + 1) * intervalMs
 * and its countdown runs from captureAt(i) - intervalMs to captureAt(i).
 */
export type BoothRound = {
  status: "running" | "stopped" | "complete"
  shots: number
  intervalMs: number
  startAt: number
  firstShot: number
  stoppedAt: number | null
  /** Number of shots that exist (indexes 0..taken-1). Null while running. */
  taken: number | null
  /** Ids of the members taking part in this round. */
  roster: number[]
}

export type BoothFinal = {
  id: number
  mime: BoothImageMime
  size: number
  save: { status: "none" | "saving" | "saved"; by: number | null }
}

export type BoothState = {
  /** Increases on every change. */
  v: number
  phase: BoothPhase
  step: BoothStep
  leaderId: number | null
  members: BoothMember[]
  config: BoothConfig
  round: BoothRound | null
  final: BoothFinal | null
}

export type BoothDeniedReason =
  | "not_member"
  | "not_leader"
  | "locked"
  | "in_lobby"
  | "too_few"
  | "bad_step"
  | "no_layout"
  | "not_ready"
  | "no_round"
  | "no_final"
  | "cannot_save"
  | "busy"
  | "already_saved"
  | "limit"
  | "not_found"

export type BoothConfigPatch = Partial<Omit<BoothConfig, "layoutId">> & {
  layoutId?: string
}

export type BoothRtcSignal =
  | {
      kind: "description"
      type: "offer" | "answer" | "pranswer" | "rollback"
      sdp?: string
    }
  | {
      kind: "candidate"
      candidate: string
      sdpMid?: string | null
      sdpMLineIndex?: number | null
      usernameFragment?: string | null
    }

// Client -> server ------------------------------------------------------------

export type BoothClientMessage =
  | { f: "booth"; t: "join" }
  | { f: "booth"; t: "leave" }
  | { f: "booth"; t: "sync"; c: number }
  | { f: "booth"; t: "ready"; ready: boolean }
  // Leader only from here, except where noted.
  | { f: "booth"; t: "begin" }
  | { f: "booth"; t: "config"; patch: BoothConfigPatch }
  | { f: "booth"; t: "go"; step: BoothStep }
  | { f: "booth"; t: "start" }
  | { f: "booth"; t: "stop" }
  | { f: "booth"; t: "continue" }
  | { f: "booth"; t: "retake" }
  | { f: "booth"; t: "new-round" }
  /** Any member: I have received this member's still. */
  | { f: "booth"; t: "still-ack"; from: number; shot: number }
  // Any member from here.
  | { f: "booth"; t: "save-claim" }
  | { f: "booth"; t: "save-done" }
  | { f: "booth"; t: "save-fail" }
  | { f: "booth"; t: "rtc"; to: number; signal: BoothRtcSignal }

export type BoothStillClientHeader = {
  f: "booth"
  t: "still"
  shot: number
  mime: "image/png" | "image/webp"
}

// Server -> client ------------------------------------------------------------

export type BoothServerMessage =
  | { f: "booth"; t: "joined"; me: number }
  | { f: "booth"; t: "refused"; reason: "full" | "already_joined" }
  | { f: "booth"; t: "state"; state: BoothState }
  | { f: "booth"; t: "sync"; c: number; s: number }
  | { f: "booth"; t: "denied"; for: string; reason: BoothDeniedReason }
  | { f: "booth"; t: "rtc"; from: number; signal: BoothRtcSignal }
  | { f: "booth"; t: "still-ack"; shot: number; by: number }
  | { f: "booth"; t: "still-failed"; shot: number }

export type BoothStillServerHeader = {
  f: "booth"
  t: "still"
  from: number
  shot: number
  mime: "image/png" | "image/webp"
}
