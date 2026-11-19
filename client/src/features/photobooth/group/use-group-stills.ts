import { useCallback, useEffect, useMemo, useReducer, useRef } from "react"

import { boothChannel } from "../session/booth-channel"
import { useBoothSessionContext } from "../session/booth-session-context"
import type { BoothState } from "../session/types"

/** Wait this long for everyone's acknowledgement before sending a still again. */
const ACK_TIMEOUT_MS = 5_000
/** The server accepts only a few sends per shot, so stop a little under that. */
const MAX_SEND_ATTEMPTS = 3
/** Don't pile a still on top of an unsent one: wait until the socket's queue is this small. */
const MAX_BUFFERED_BYTES = 8 * 1024 * 1024
const BUFFER_POLL_MS = 250
const BUFFER_GIVE_UP_MS = 15_000
const RETRY_AFTER_FAILURE_MS = 1_000

export type StillEntry = { blob: Blob; url: string }

export type GroupStills = {
  /** Changes whenever a still arrives or is dropped. Use it as an effect / memo dependency. */
  version: number
  /** One person's still for one shot, or undefined if it has not arrived. */
  get: (memberId: number, shot: number) => StillEntry | undefined
  /** Keep my own still and send it to everyone else in the round. */
  addOwn: (shot: number, blob: Blob) => void
  /** Do I have every still of every roster member for shots 0..count-1? */
  hasAll: (count: number) => boolean
}

type Mime = "image/png" | "image/webp"
const asMime = (type: string): Mime =>
  type === "image/webp" ? "image/webp" : "image/png"

/**
 * Everyone's stills for the current round: mine, and the ones the others send. It lives above the
 * steps (not inside the photos step) so a still that is still arriving when the group moves to the
 * frame step isn't lost.
 *
 * - Sending: the server relays each still to everyone in the round. Each receiver acknowledges it
 *   (`still-ack`), and the server tells the sender who has. A still that isn't acknowledged in time,
 *   or that the server says only partly got through (`still-failed`), is sent again, a few times.
 * - Receiving: duplicates are kept once (but acknowledged again, since the sender may have missed
 *   the first acknowledgement).
 * - A new round (or leaving it) drops everything and frees the image URLs.
 */
export function useGroupStills(): GroupStills {
  const { me, state } = useBoothSessionContext()
  const [version, bump] = useReducer((value: number) => value + 1, 0)

  // member id -> shot -> still
  const store = useRef(new Map<number, Map<number, StillEntry>>())
  // shot -> ids that have confirmed my still / sends made / pending timers
  const acked = useRef(new Map<number, Set<number>>())
  const attempts = useRef(new Map<number, number>())
  const timers = useRef(new Map<number, number>())

  // The latest state and id, read from callbacks that must not change identity.
  const stateRef = useRef<BoothState | null>(state)
  const meRef = useRef<number | null>(me)
  useEffect(() => {
    stateRef.current = state
    meRef.current = me
  })

  const clearAll = useCallback(() => {
    for (const shots of store.current.values()) {
      for (const entry of shots.values()) URL.revokeObjectURL(entry.url)
    }
    store.current.clear()
    acked.current.clear()
    attempts.current.clear()
    for (const timer of timers.current.values()) window.clearTimeout(timer)
    timers.current.clear()
  }, [])

  /** Everyone else still in this round: the people who should confirm my stills. */
  const recipients = useCallback((): number[] => {
    const current = stateRef.current
    const round = current?.round
    if (!current || !round) return []
    return current.members
      .filter(
        (member) =>
          member.status === "active" &&
          member.id !== meRef.current &&
          round.roster.includes(member.id),
      )
      .map((member) => member.id)
  }, [])

  const send = useCallback(
    async (shot: number) => {
      const entry = store.current.get(meRef.current ?? -1)?.get(shot)
      if (!entry) return

      attempts.current.set(shot, (attempts.current.get(shot) ?? 0) + 1)

      const waitedFrom = Date.now()
      while (boothChannel.bufferedAmount() > MAX_BUFFERED_BYTES) {
        if (Date.now() - waitedFrom > BUFFER_GIVE_UP_MS) break
        await new Promise((resolve) => window.setTimeout(resolve, BUFFER_POLL_MS))
        // The still may have been dropped (new round) while waiting.
        if (!store.current.get(meRef.current ?? -1)?.has(shot)) return
      }

      boothChannel.sendStill(
        { f: "booth", t: "still", shot, mime: asMime(entry.blob.type) },
        entry.blob,
      )

      window.clearTimeout(timers.current.get(shot))
      timers.current.set(
        shot,
        window.setTimeout(() => {
          const have = acked.current.get(shot)
          const missing = recipients().some((id) => !have?.has(id))
          if (missing && (attempts.current.get(shot) ?? 0) < MAX_SEND_ATTEMPTS) {
            void send(shot)
          }
        }, ACK_TIMEOUT_MS),
      )
    },
    [recipients],
  )

  const addOwn = useCallback(
    (shot: number, blob: Blob) => {
      const id = meRef.current
      if (id === null) return
      const mine = store.current.get(id) ?? new Map<number, StillEntry>()
      if (mine.has(shot)) return // one still per shot
      mine.set(shot, { blob, url: URL.createObjectURL(blob) })
      store.current.set(id, mine)
      bump()
      void send(shot)
    },
    [send],
  )

  // Incoming stills and acknowledgements.
  useEffect(() => {
    const stopStills = boothChannel.subscribeStills((header, blob) => {
      const round = stateRef.current?.round
      if (!round || !round.roster.includes(header.from)) return
      if (header.from === meRef.current) return

      const theirs = store.current.get(header.from) ?? new Map<number, StillEntry>()
      if (!theirs.has(header.shot)) {
        theirs.set(header.shot, { blob, url: URL.createObjectURL(blob) })
        store.current.set(header.from, theirs)
        bump()
      }
      // Always confirm, even a duplicate: the sender may not have seen the first confirmation.
      boothChannel.send({
        f: "booth",
        t: "still-ack",
        from: header.from,
        shot: header.shot,
      })
    })

    const stopMessages = boothChannel.subscribe((message) => {
      if (message.t === "still-ack") {
        const set = acked.current.get(message.shot) ?? new Set<number>()
        set.add(message.by)
        acked.current.set(message.shot, set)
      } else if (message.t === "still-failed") {
        const shot = message.shot
        window.clearTimeout(timers.current.get(shot))
        if ((attempts.current.get(shot) ?? 0) < MAX_SEND_ATTEMPTS) {
          timers.current.set(
            shot,
            window.setTimeout(() => void send(shot), RETRY_AFTER_FAILURE_MS),
          )
        }
      }
    })

    return () => {
      stopStills()
      stopMessages()
    }
  }, [send])

  // No round, no stills. Also drop shots past the cut-off when a round is stopped early.
  const hasRound = state?.round != null
  const taken = state?.round?.taken ?? null
  useEffect(() => {
    if (!hasRound) {
      if (store.current.size > 0) {
        clearAll()
        bump()
      }
      return
    }
    if (taken === null) return

    let dropped = false
    for (const shots of store.current.values()) {
      for (const [shot, entry] of shots) {
        if (shot >= taken) {
          URL.revokeObjectURL(entry.url)
          shots.delete(shot)
          dropped = true
        }
      }
    }
    if (dropped) bump()
  }, [hasRound, taken, clearAll])

  useEffect(() => clearAll, [clearAll])

  const get = useCallback(
    (memberId: number, shot: number) => store.current.get(memberId)?.get(shot),
    [],
  )

  const hasAll = useCallback((count: number) => {
    const round = stateRef.current?.round
    if (!round) return false
    return round.roster.every((id) => {
      const shots = store.current.get(id)
      return (
        shots !== undefined &&
        Array.from({ length: count }, (_, shot) => shots.has(shot)).every(Boolean)
      )
    })
  }, [])

  // `version` is part of the value so anything reading from it re-renders when stills change.
  return useMemo(
    () => ({ version, get, addOwn, hasAll }),
    [version, get, addOwn, hasAll],
  )
}
