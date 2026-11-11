import type { Role } from "#features/auth"

/** Namespace on the shared socket (the `f` field). Must match the server. */
export const CURSOR_FEATURE = "cursor"

/** Only these roles get cursors. Mirrors `roles` on the server's live-cursor feature. */
export const CURSOR_ROLES: readonly Role[] = ["admin", "partner"]

/** Anchor names are validated on both ends against this. */
export const ANCHOR_NAME_PATTERN = /^[a-z0-9_-]{1,32}$/i

// Sending
/** At most one position per this many ms (~30 Hz). */
export const SEND_INTERVAL_MS = 33
/** Don't send unless the position moved by at least this fraction. */
export const MIN_DELTA = 0.001

// Receiving
/** Smoothing time constant: ~63% of the remaining distance per tau. 50 = snappy, 80 = default, 120+ = floaty. */
export const SMOOTHING_TAU_MS = 80
/** Caps the time step after a stalled frame (e.g. a backgrounded tab). */
export const MAX_FRAME_DT_MS = 100
/** A cursor that hasn't moved for this long is dimmed. */
export const IDLE_AFTER_MS = 4000
export const IDLE_OPACITY = 0.35
