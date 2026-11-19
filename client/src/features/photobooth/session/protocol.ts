import type {
  BoothConfig,
  BoothDeniedReason,
  BoothFinal,
  BoothImageMime,
  BoothMember,
  BoothRole,
  BoothRound,
  BoothRtcSignal,
  BoothServerMessage,
  BoothState,
  BoothStep,
  BoothStillServerHeader,
} from "./types"

export const BOOTH_FEATURE = "booth" as const

// Inbound validation. Types vanish at runtime, so nothing from the socket is trusted.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const isId = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1

const isString = (value: unknown): value is string => typeof value === "string"

const MAX_NAME_LENGTH = 64
const ROLES: readonly BoothRole[] = ["admin", "partner", "guest"]
const MIMES: readonly BoothImageMime[] = ["image/png", "image/webp", "image/jpeg"]
const REASONS: readonly BoothDeniedReason[] = [
  "not_member",
  "not_leader",
  "locked",
  "in_lobby",
  "too_few",
  "bad_step",
  "no_layout",
  "not_ready",
  "no_round",
  "no_final",
  "cannot_save",
  "busy",
  "already_saved",
  "limit",
  "not_found",
]

function parseStep(value: unknown): BoothStep | null {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : null
}

function parseMember(value: unknown): BoothMember | null {
  if (!isRecord(value)) return null
  const { id, name, role, status, ready } = value
  const matchedRole = ROLES.find((candidate) => candidate === role)
  if (!isId(id) || !isString(name) || !matchedRole) return null
  if (status !== "active" && status !== "waiting") return null
  if (typeof ready !== "boolean") return null
  return {
    id,
    name: name.slice(0, MAX_NAME_LENGTH),
    role: matchedRole,
    status,
    ready,
  }
}

function parseConfig(value: unknown): BoothConfig | null {
  if (!isRecord(value)) return null
  const { layoutId, scene, intervalId, removeBackground, filterId, frameColor } =
    value
  if (layoutId !== null && !isString(layoutId)) return null
  if (scene !== "one-scene" && scene !== "separate-cells") return null
  if (!isString(intervalId) || !isString(filterId)) return null
  if (typeof removeBackground !== "boolean") return null
  if (!isString(frameColor) || !/^#[0-9a-f]{6}$/i.test(frameColor)) return null
  return {
    layoutId,
    scene,
    intervalId,
    removeBackground,
    filterId,
    frameColor: frameColor.toLowerCase(),
  }
}

function parseRound(value: unknown): BoothRound | null {
  if (!isRecord(value)) return null
  const { status, shots, intervalMs, startAt, firstShot, stoppedAt, taken, roster } =
    value
  if (status !== "running" && status !== "stopped" && status !== "complete") {
    return null
  }
  if (!isNumber(shots) || !isNumber(intervalMs) || !isNumber(startAt)) return null
  if (!isNumber(firstShot)) return null
  if (stoppedAt !== null && !isNumber(stoppedAt)) return null
  if (taken !== null && !isNumber(taken)) return null
  if (!Array.isArray(roster) || !roster.every(isId)) return null
  return {
    status,
    shots,
    intervalMs,
    startAt,
    firstShot,
    stoppedAt,
    taken,
    roster: roster as number[],
  }
}

function parseFinal(value: unknown): BoothFinal | null {
  if (!isRecord(value)) return null
  const { id, mime, size, save } = value
  const matchedMime = MIMES.find((candidate) => candidate === mime)
  if (!isId(id) || !matchedMime || !isNumber(size) || !isRecord(save)) return null
  const { status, by } = save
  if (status !== "none" && status !== "saving" && status !== "saved") return null
  if (by !== null && !isId(by)) return null
  return { id, mime: matchedMime, size, save: { status, by } }
}

function parseState(value: unknown): BoothState | null {
  if (!isRecord(value)) return null
  const { v, phase, step, leaderId, members, config, round, final } = value
  if (!isNumber(v)) return null
  if (phase !== "lobby" && phase !== "flow") return null
  const parsedStep = parseStep(step)
  if (!parsedStep) return null
  if (leaderId !== null && !isId(leaderId)) return null
  if (!Array.isArray(members)) return null

  const parsedMembers = members.map(parseMember)
  if (parsedMembers.some((member) => member === null)) return null
  const parsedConfig = parseConfig(config)
  if (!parsedConfig) return null

  const parsedRound = round === null ? null : parseRound(round)
  if (round !== null && !parsedRound) return null
  const parsedFinal = final === null ? null : parseFinal(final)
  if (final !== null && !parsedFinal) return null

  return {
    v,
    phase,
    step: parsedStep,
    leaderId,
    members: parsedMembers as BoothMember[],
    config: parsedConfig,
    round: parsedRound,
    final: parsedFinal,
  }
}

function parseSignal(value: unknown): BoothRtcSignal | null {
  if (!isRecord(value)) return null
  if (value.kind === "description") {
    const { type, sdp } = value
    if (
      type !== "offer" &&
      type !== "answer" &&
      type !== "pranswer" &&
      type !== "rollback"
    ) {
      return null
    }
    if (sdp !== undefined && !isString(sdp)) return null
    return { kind: "description", type, sdp }
  }
  if (value.kind === "candidate") {
    const { candidate, sdpMid, sdpMLineIndex, usernameFragment } = value
    if (!isString(candidate)) return null
    return {
      kind: "candidate",
      candidate,
      sdpMid: isString(sdpMid) ? sdpMid : null,
      sdpMLineIndex: isNumber(sdpMLineIndex) ? sdpMLineIndex : null,
      usernameFragment: isString(usernameFragment) ? usernameFragment : null,
    }
  }
  return null
}

/** Returns the message if it is a well-formed booth message, otherwise null. */
export function parseBoothMessage(value: unknown): BoothServerMessage | null {
  if (!isRecord(value) || value.f !== BOOTH_FEATURE) return null

  switch (value.t) {
    case "joined":
      return isId(value.me)
        ? { f: BOOTH_FEATURE, t: "joined", me: value.me }
        : null
    case "refused":
      return value.reason === "full" || value.reason === "already_joined"
        ? { f: BOOTH_FEATURE, t: "refused", reason: value.reason }
        : null
    case "state": {
      const state = parseState(value.state)
      return state ? { f: BOOTH_FEATURE, t: "state", state } : null
    }
    case "sync":
      return isNumber(value.c) && isNumber(value.s)
        ? { f: BOOTH_FEATURE, t: "sync", c: value.c, s: value.s }
        : null
    case "denied": {
      const reason = REASONS.find((candidate) => candidate === value.reason)
      return isString(value.for) && reason
        ? { f: BOOTH_FEATURE, t: "denied", for: value.for, reason }
        : null
    }
    case "rtc": {
      const signal = parseSignal(value.signal)
      return isId(value.from) && signal
        ? { f: BOOTH_FEATURE, t: "rtc", from: value.from, signal }
        : null
    }
    case "still-ack":
      return isNumber(value.shot) && isId(value.by)
        ? { f: BOOTH_FEATURE, t: "still-ack", shot: value.shot, by: value.by }
        : null
    case "still-failed":
      return isNumber(value.shot)
        ? { f: BOOTH_FEATURE, t: "still-failed", shot: value.shot }
        : null
    default:
      return null
  }
}

/** Returns the header if it is a well-formed still header, otherwise null. */
export function parseStillHeader(value: unknown): BoothStillServerHeader | null {
  if (!isRecord(value) || value.f !== BOOTH_FEATURE || value.t !== "still") {
    return null
  }
  const { from, shot, mime } = value
  if (!isId(from) || !Number.isInteger(shot) || (shot as number) < 0) return null
  if (mime !== "image/png" && mime !== "image/webp") return null
  return { f: BOOTH_FEATURE, t: "still", from, shot: shot as number, mime }
}
