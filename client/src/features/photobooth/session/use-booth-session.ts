import { useCallback, useEffect, useMemo, useState } from "react"

import { useSocketConnection } from "#hooks/use-socket-connection"
import type { SocketStatus } from "#services/socket"

import { boothChannel } from "./booth-channel"
import { ClockSync } from "./clock-sync"
import type {
  BoothClientMessage,
  BoothConfigPatch,
  BoothDeniedReason,
  BoothMember,
  BoothState,
  BoothStep,
} from "./types"

/** Pings sent right after joining, so the clock is usable within about two seconds. */
const SYNC_BURST = 8
const SYNC_BURST_INTERVAL_MS = 250
/** After that, one ping now and then keeps following drift. */
const SYNC_STEADY_INTERVAL_MS = 30_000
/** The countdown waits for this many samples. */
const SYNC_MIN_SAMPLES = 3

export type BoothRefusal = "full" | "already_joined"

/** A request the server turned down. A fresh `state` always follows, so the screen can fall back to it. */
export type BoothDenied = {
  /** Increases for every denial, so the same reason twice in a row is still a new event. */
  id: number
  /** The request that was refused ('config', 'start', ...). */
  for: string
  reason: BoothDeniedReason
}

/** The requests a person can make. The server decides who is allowed: the others get `denied`. */
export type BoothActions = {
  /** Leader: leave the lobby for step 1 (needs 2 people). */
  begin: () => void
  /** Leader: change layout, experience or frame colour. */
  setConfig: (patch: BoothConfigPatch) => void
  /** Leader: move to another step. */
  go: (step: BoothStep) => void
  /** Leader: start the shared countdown (needs everyone ready). */
  start: () => void
  /** Leader: stop the countdown. */
  stop: () => void
  /** Leader: after a stop, carry on with the remaining shots. */
  continueRound: () => void
  /** Leader: throw the round away and go back to step 3. */
  retake: () => void
  /** Leader: from the frame step, back to step 1. */
  newRound: () => void
  /** Everyone: my camera is running and visible (or not). */
  setReady: (ready: boolean) => void
  /** admin / partner: I will save this photo to the gallery. The first claim wins. */
  claimSave: () => void
  finishSave: () => void
  failSave: () => void
}

export type BoothSession = {
  /** The shared socket's status. */
  connection: SocketStatus
  /**
   * connecting: the socket is not open yet. joining: waiting for the server to answer.
   * joined: in the session. refused: the session is full, or this account is already in it
   * from another tab or device.
   */
  joinStatus: "connecting" | "joining" | "joined" | "refused"
  refusal: BoothRefusal | null
  /** This person's member id (the id of their socket connection). */
  me: number | null
  /** This person's entry in `state.members`. */
  self: BoothMember | null
  /** Everything the server knows. Null until joined. Never edit it: send a request instead. */
  state: BoothState | null
  isLeader: boolean
  /** The clock estimate has enough samples for the countdown to be trusted. */
  clockReady: boolean
  /** The server's clock, as far as it can be told. Place the shared timeline with it. */
  serverNow: () => number
  denied: BoothDenied | null
  actions: BoothActions
}

/**
 * Takes part in the shared photobooth session while the calling component is mounted: joins when
 * the socket opens, leaves on unmount (or when the socket drops, since the server removes a
 * dropped connection), keeps the server's state, and keeps the clock in sync.
 *
 * Use it once, through <BoothSessionProvider>, and read it with useBoothSessionContext().
 */
export function useBoothSession(enabled = true): BoothSession {
  const connection = useSocketConnection(enabled)
  const [clock] = useState(() => new ClockSync())

  const [me, setMe] = useState<number | null>(null)
  const [state, setState] = useState<BoothState | null>(null)
  const [refusal, setRefusal] = useState<BoothRefusal | null>(null)
  const [clockReady, setClockReady] = useState(false)
  const [denied, setDenied] = useState<BoothDenied | null>(null)

  useEffect(() => {
    if (!enabled || connection !== "open") return

    let deniedCount = 0

    // Subscribe before joining, so the first answer can't be missed.
    const unsubscribe = boothChannel.subscribe((message) => {
      switch (message.t) {
        case "joined":
          setMe(message.me)
          break
        case "refused":
          setRefusal(message.reason)
          break
        case "state":
          // Never go back to an older state, whatever order messages arrive in.
          setState((current) =>
            current && message.state.v < current.v ? current : message.state,
          )
          break
        case "sync":
          if (
            clock.addSample(message.c, message.s) &&
            clock.sampleCount >= SYNC_MIN_SAMPLES
          ) {
            setClockReady(true)
          }
          break
        case "denied":
          deniedCount += 1
          setDenied({
            id: deniedCount,
            for: message.for,
            reason: message.reason,
          })
          break
        default:
          // rtc and still messages belong to the preview and the photo exchange.
          break
      }
    })

    const ping = () =>
      boothChannel.send({ f: "booth", t: "sync", c: clock.now() })

    boothChannel.send({ f: "booth", t: "join" })
    ping()
    let pings = 1
    const burst = window.setInterval(() => {
      ping()
      pings += 1
      if (pings >= SYNC_BURST) window.clearInterval(burst)
    }, SYNC_BURST_INTERVAL_MS)
    const steady = window.setInterval(ping, SYNC_STEADY_INTERVAL_MS)

    return () => {
      unsubscribe()
      window.clearInterval(burst)
      window.clearInterval(steady)
      boothChannel.send({ f: "booth", t: "leave" })
      // A new connection is a new member, so nothing from this one carries over.
      clock.reset()
      setMe(null)
      setState(null)
      setRefusal(null)
      setClockReady(false)
      setDenied(null)
    }
  }, [enabled, connection, clock])

  const serverNow = useCallback(() => clock.serverNow(), [clock])

  const actions = useMemo<BoothActions>(() => {
    const send = (message: BoothClientMessage) => {
      boothChannel.send(message)
    }
    return {
      begin: () => send({ f: "booth", t: "begin" }),
      setConfig: (patch) => send({ f: "booth", t: "config", patch }),
      go: (step) => send({ f: "booth", t: "go", step }),
      start: () => send({ f: "booth", t: "start" }),
      stop: () => send({ f: "booth", t: "stop" }),
      continueRound: () => send({ f: "booth", t: "continue" }),
      retake: () => send({ f: "booth", t: "retake" }),
      newRound: () => send({ f: "booth", t: "new-round" }),
      setReady: (ready) => send({ f: "booth", t: "ready", ready }),
      claimSave: () => send({ f: "booth", t: "save-claim" }),
      finishSave: () => send({ f: "booth", t: "save-done" }),
      failSave: () => send({ f: "booth", t: "save-fail" }),
    }
  }, [])

  const self = state?.members.find((member) => member.id === me) ?? null
  const joinStatus: BoothSession["joinStatus"] = refusal
    ? "refused"
    : connection !== "open"
      ? "connecting"
      : state && self
        ? "joined"
        : "joining"

  return {
    connection,
    joinStatus,
    refusal,
    me,
    self,
    state,
    isLeader: me !== null && state?.leaderId === me,
    clockReady,
    serverNow,
    denied,
    actions,
  }
}
