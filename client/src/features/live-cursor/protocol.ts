import { ANCHOR_NAME_PATTERN, CURSOR_FEATURE } from "./constants.ts"
import type {
  CursorClientMessage,
  CursorPos,
  CursorServerMessage,
  CursorShape,
  CursorUser,
} from "./types.ts"
import { clamp01 } from "./utils.ts"

// Outbound ----------------------------------------------------------------

export const moveMessage = (pos: CursorPos): CursorClientMessage => ({
  f: CURSOR_FEATURE,
  t: "m",
  ...pos,
})

export const LEAVE_MESSAGE: CursorClientMessage = {
  f: CURSOR_FEATURE,
  t: "leave",
}

// Inbound: validation. Types vanish at runtime, so nothing from the socket is trusted.

const SHAPES: readonly CursorShape[] = ["triangle", "diamond", "circle", "square"]
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const MAX_NAME_LENGTH = 64

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const isId = (value: unknown): value is number => Number.isInteger(value)

function parseUser(value: unknown): CursorUser | null {
  if (!isRecord(value)) return null
  const { name, color, shape } = value
  if (typeof name !== "string") return null
  if (typeof color !== "string" || !COLOR_PATTERN.test(color)) return null
  const matched = SHAPES.find((candidate) => candidate === shape)
  if (!matched) return null
  return { name: name.slice(0, MAX_NAME_LENGTH), color, shape: matched }
}

function parsePos(value: Record<string, unknown>): CursorPos | null {
  const { a, x, y, fx, fy } = value
  if (!isNumber(fx) || !isNumber(fy)) return null

  if (a === null) return { a: null, fx: clamp01(fx), fy: clamp01(fy) }

  if (
    typeof a === "string" &&
    ANCHOR_NAME_PATTERN.test(a) &&
    isNumber(x) &&
    isNumber(y)
  ) {
    return { a, x: clamp01(x), y: clamp01(y), fx: clamp01(fx), fy: clamp01(fy) }
  }
  return null
}

/** Returns the message if it is a well-formed cursor message, otherwise null. */
export function parseCursorMessage(value: unknown): CursorServerMessage | null {
  if (!isRecord(value) || value.f !== CURSOR_FEATURE) return null

  switch (value.t) {
    case "snap": {
      if (!Array.isArray(value.peers)) return null
      const peers = value.peers.flatMap((item: unknown) => {
        if (!isRecord(item) || !isId(item.id)) return []
        const user = parseUser(item.user)
        if (!user) return []
        const pos = isRecord(item.pos) ? parsePos(item.pos) : null
        return [{ id: item.id, user, pos }]
      })
      return { f: CURSOR_FEATURE, t: "snap", peers }
    }
    case "join": {
      if (!isId(value.id)) return null
      const user = parseUser(value.user)
      return user ? { f: CURSOR_FEATURE, t: "join", id: value.id, user } : null
    }
    case "m": {
      if (!isId(value.id)) return null
      const pos = parsePos(value)
      return pos ? { f: CURSOR_FEATURE, t: "m", id: value.id, ...pos } : null
    }
    case "leave":
      return isId(value.id)
        ? { f: CURSOR_FEATURE, t: "leave", id: value.id }
        : null
    default:
      return null
  }
}
