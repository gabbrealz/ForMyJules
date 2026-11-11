// Wire protocol. Mirrors the server's sockets/live-cursor.types.ts: keep the two in sync.

export type CursorShape = "triangle" | "diamond" | "circle" | "square"

export type CursorUser = {
  name: string
  color: string
  shape: CursorShape
}

/**
 * Where a pointer is. `x`/`y` are fractions of the anchor element's box, `fx`/`fy`
 * fractions of the whole page. `a` is null when the pointer isn't over an anchor.
 */
export type CursorPos =
  | { a: string; x: number; y: number; fx: number; fy: number }
  | { a: null; fx: number; fy: number }

export type CursorClientMessage =
  | ({ f: "cursor"; t: "m" } & CursorPos)
  | { f: "cursor"; t: "leave" }

export type CursorServerMessage =
  | {
      f: "cursor"
      t: "snap"
      peers: { id: number; user: CursorUser; pos: CursorPos | null }[]
    }
  | { f: "cursor"; t: "join"; id: number; user: CursorUser }
  | ({ f: "cursor"; t: "m"; id: number } & CursorPos)
  | { f: "cursor"; t: "leave"; id: number }

/** Someone else's cursor. */
export type Peer = {
  readonly id: number
  readonly user: CursorUser
  /**
   * Latest position, or null until their first move. Replaced (not edited) on
   * every move message and read by the animation loop, never by React renders.
   */
  pos: CursorPos | null
}
