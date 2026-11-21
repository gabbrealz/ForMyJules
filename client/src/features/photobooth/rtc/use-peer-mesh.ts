import { useEffect, useRef, useState } from "react"

import { boothChannel } from "../session/booth-channel"
import { useBoothSessionContext } from "../session/booth-session-context"
import type { BoothRtcSignal } from "../session/types"
import { fetchIceConfig, fetchRelayServers } from "./ice-servers"

export type PreviewState = "connecting" | "connected" | "failed"

/** Someone else's live camera. `stream` is null until their video starts arriving. */
export type RemotePreview = { stream: MediaStream | null; state: PreviewState }

/** A modest preview: the full-quality photo travels separately, as a still. */
const MAX_PREVIEW_BITRATE = 700_000
const MAX_PREVIEW_FRAMERATE = 20
/** How long a direct (free) connection gets before the relay is tried as well. */
const DIRECT_ATTEMPT_MS = 7_000
/**
 * An offer sent before the other person's page was listening is simply lost (signalling is not
 * stored). While a link is unanswered, send the same offer again now and then, a few times.
 */
const OFFER_RETRY_MS = 2_500
const MAX_OFFER_RETRIES = 5

type Peer = {
  pc: RTCPeerConnection
  sender: RTCRtpSender
  /** The side with the higher id gives way when both send an offer at once. */
  polite: boolean
  makingOffer: boolean
  ignoreOffer: boolean
  restarted: boolean
  /** The TURN relay has been added to this link (the fallback, used at most once). */
  relayTried: boolean
  fallbackTimer: number | undefined
  offerRetryTimer: number | undefined
  offerRetries: number
  stream: MediaStream | null
  state: PreviewState
  /** Signals are handled one at a time, in the order they arrived. */
  queue: Promise<void>
}

/**
 * A live video link to every other person in the booth (a full mesh: at most 4 people, so at most
 * 3 links each). Only the preview travels this way; photos go over the WebSocket.
 *
 * What is sent is `localTrack`: the plain camera, or, with the background removed, the packed
 * colour-plus-matte video from `useAlphaPacker`, since a video call can't carry transparency.
 *
 * Connections try the free route first. They start with STUN servers only, which connects most
 * networks directly. Only a link that hasn't connected after a few seconds (or has failed) asks the
 * server for TURN credentials and retries through the relay, so relayed traffic, the one thing here
 * that can cost bandwidth, is used only where nothing else works.
 *
 * Signalling goes through the booth channel (`rtc` messages). Connections follow "perfect
 * negotiation", so both sides can start at once without a fight over who offers. Everyone sends
 * and receives on one video transceiver, so a person without a camera yet can still see the others,
 * and the track can be swapped without renegotiating.
 *
 * Failure is quiet: a link that can't be made shows as 'failed' and the photobooth carries on,
 * because the photos never depended on the preview.
 */
export function usePeerMesh(
  enabled: boolean,
  localTrack: MediaStreamTrack | null,
): ReadonlyMap<number, RemotePreview> {
  const { me, state } = useBoothSessionContext()
  const [previews, setPreviews] = useState<ReadonlyMap<number, RemotePreview>>(
    () => new Map(),
  )

  // Read from inside the long-lived effect below without restarting it.
  const memberIds = (state?.members ?? [])
    .map((member) => member.id)
    .filter((id) => id !== me)
  const memberKey = memberIds.join(",")
  const memberIdsRef = useRef<number[]>(memberIds)
  const localTrackRef = useRef<MediaStreamTrack | null>(localTrack)
  const syncRef = useRef<(() => void) | null>(null)
  const applyLocalRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    memberIdsRef.current = memberKey ? memberKey.split(",").map(Number) : []
    localTrackRef.current = localTrack
    syncRef.current?.()
    applyLocalRef.current?.()
  }, [memberKey, localTrack])

  useEffect(() => {
    if (!enabled || me === null) return
    const myId = me

    const controller = new AbortController()
    const peers = new Map<number, Peer>()
    const early: { from: number; signal: BoothRtcSignal }[] = []
    let stunServers: RTCIceServer[] | null = null
    let relayAvailable = false
    let relayRequest: Promise<RTCIceServer[]> | null = null
    let closed = false

    const publish = () => {
      setPreviews(
        new Map(
          [...peers].map(([id, peer]) => [
            id,
            { stream: peer.stream, state: peer.state },
          ]),
        ),
      )
    }

    const send = (to: number, signal: BoothRtcSignal) => {
      boothChannel.send({ f: "booth", t: "rtc", to, signal })
    }

    const sendDescription = (to: number, description: RTCSessionDescription | null) => {
      if (!description) return
      send(to, {
        kind: "description",
        type: description.type,
        sdp: description.sdp,
      })
    }

    const limitBitrate = async (peer: Peer) => {
      try {
        const parameters = peer.sender.getParameters()
        if (!parameters.encodings?.length) parameters.encodings = [{}]
        parameters.encodings[0].maxBitrate = MAX_PREVIEW_BITRATE
        parameters.encodings[0].maxFramerate = MAX_PREVIEW_FRAMERATE
        await peer.sender.setParameters(parameters)
      } catch {
        // Not every browser allows it; the preview just uses what it likes.
      }
    }

    /**
     * The fallback: add the TURN relay to this link and gather candidates again. Credentials are
     * requested here, not up front, and shared by every link that needs them. Both ends of a link
     * do this on their own once their direct attempt has stalled.
     */
    const useRelay = async (peer: Peer) => {
      if (peer.relayTried || !relayAvailable || !stunServers || closed) return
      peer.relayTried = true

      relayRequest ??= fetchRelayServers(controller.signal)
      let relays: RTCIceServer[]
      try {
        relays = await relayRequest
      } catch {
        return // aborted
      }
      if (closed || peer.pc.signalingState === "closed") return
      if (relays.length === 0) {
        console.warn("[booth] The server returned no TURN relay servers.")
        return
      }
      console.info("[booth] Direct preview link not up: trying the TURN relay.")

      peer.pc.setConfiguration({
        ...peer.pc.getConfiguration(),
        iceServers: [...stunServers, ...relays],
      })
      peer.pc.restartIce()
    }

    const createPeer = (id: number): Peer | null => {
      if (!stunServers || closed) return null

      const pc = new RTCPeerConnection({ iceServers: stunServers })
      const transceiver = pc.addTransceiver("video", { direction: "sendrecv" })
      const peer: Peer = {
        pc,
        sender: transceiver.sender,
        polite: myId > id,
        makingOffer: false,
        ignoreOffer: false,
        restarted: false,
        relayTried: false,
        fallbackTimer: undefined,
        offerRetryTimer: undefined,
        offerRetries: 0,
        stream: null,
        state: "connecting",
        queue: Promise.resolve(),
      }

      // Still not connected: the direct route isn't working, so bring in the relay.
      peer.fallbackTimer = window.setTimeout(() => {
        if (peer.state === "connected") return
        if (!relayAvailable) {
          console.warn(
            `[booth] No preview connection to member ${id} after ${DIRECT_ATTEMPT_MS / 1000}s, and the ` +
              "server has no TURN relay to fall back to (set METERED_APP_NAME and METERED_API_KEY).",
          )
        }
        void useRelay(peer)
      }, DIRECT_ATTEMPT_MS)

      peer.offerRetryTimer = window.setInterval(() => {
        if (peer.state === "connected" || peer.offerRetries >= MAX_OFFER_RETRIES) {
          window.clearInterval(peer.offerRetryTimer)
          return
        }
        // Our offer is still waiting for an answer: the other side may never have received it.
        if (pc.signalingState === "have-local-offer" && pc.localDescription) {
          peer.offerRetries += 1
          sendDescription(id, pc.localDescription)
        }
      }, OFFER_RETRY_MS)

      pc.onnegotiationneeded = async () => {
        try {
          peer.makingOffer = true
          await pc.setLocalDescription()
          sendDescription(id, pc.localDescription)
        } catch (error) {
          console.warn("Preview negotiation failed:", error)
        } finally {
          peer.makingOffer = false
        }
      }

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return
        const json = candidate.toJSON()
        if (!json.candidate) return
        send(id, {
          kind: "candidate",
          candidate: json.candidate,
          sdpMid: json.sdpMid ?? null,
          sdpMLineIndex: json.sdpMLineIndex ?? null,
          usernameFragment: json.usernameFragment ?? null,
        })
      }

      pc.ontrack = ({ track, streams }) => {
        peer.stream = streams[0] ?? new MediaStream([track])
        publish()
      }

      pc.onconnectionstatechange = () => {
        const { connectionState } = pc
        if (connectionState === "connected") {
          window.clearTimeout(peer.fallbackTimer)
          window.clearInterval(peer.offerRetryTimer)
          peer.state = "connected"
          void limitBitrate(peer)
        } else if (connectionState === "failed") {
          // First the relay (if there is one), then one plain retry, then give up.
          if (!peer.relayTried && relayAvailable) {
            void useRelay(peer)
            return
          }
          if (!peer.restarted) {
            peer.restarted = true
            pc.restartIce()
            return
          }
          peer.state = "failed"
        } else if (connectionState === "connecting" || connectionState === "new") {
          peer.state = "connecting"
        }
        publish()
      }

      void peer.sender.replaceTrack(localTrackRef.current)
      peers.set(id, peer)
      publish()
      return peer
    }

    const closePeer = (id: number) => {
      const peer = peers.get(id)
      if (!peer) return
      window.clearTimeout(peer.fallbackTimer)
      window.clearInterval(peer.offerRetryTimer)
      peer.pc.onnegotiationneeded = null
      peer.pc.onicecandidate = null
      peer.pc.ontrack = null
      peer.pc.onconnectionstatechange = null
      peer.pc.close()
      peers.delete(id)
    }

    /** Make the set of links match the people who are here now. */
    const sync = () => {
      if (!stunServers || closed) return
      const wanted = new Set(memberIdsRef.current)
      let changed = false
      for (const id of [...peers.keys()]) {
        if (!wanted.has(id)) {
          closePeer(id)
          changed = true
        }
      }
      for (const id of wanted) {
        if (!peers.has(id)) createPeer(id)
      }
      if (changed) publish()
    }

    const applyLocal = () => {
      for (const peer of peers.values()) {
        void peer.sender.replaceTrack(localTrackRef.current)
      }
    }

    const handle = async (from: number, signal: BoothRtcSignal) => {
      const peer =
        peers.get(from) ??
        (memberIdsRef.current.includes(from) ? createPeer(from) : null)
      if (!peer) return

      peer.queue = peer.queue.then(async () => {
        const { pc } = peer
        try {
          if (signal.kind === "description") {
            const offerCollision =
              signal.type === "offer" &&
              (peer.makingOffer || pc.signalingState !== "stable")
            peer.ignoreOffer = !peer.polite && offerCollision
            if (peer.ignoreOffer) return

            await pc.setRemoteDescription({ type: signal.type, sdp: signal.sdp })
            if (signal.type === "offer") {
              await pc.setLocalDescription()
              sendDescription(from, pc.localDescription)
            }
          } else {
            try {
              await pc.addIceCandidate({
                candidate: signal.candidate,
                sdpMid: signal.sdpMid ?? undefined,
                sdpMLineIndex: signal.sdpMLineIndex ?? undefined,
                usernameFragment: signal.usernameFragment ?? undefined,
              })
            } catch (error) {
              // Candidates that belong to an offer we ignored are expected to fail.
              if (!peer.ignoreOffer) throw error
            }
          }
        } catch (error) {
          console.warn("Preview signalling failed:", error)
        }
      })
    }

    const unsubscribe = boothChannel.subscribe((message) => {
      if (message.t !== "rtc") return
      if (!stunServers) {
        early.push({ from: message.from, signal: message.signal })
        return
      }
      void handle(message.from, message.signal)
    })

    syncRef.current = sync
    applyLocalRef.current = applyLocal

    fetchIceConfig(controller.signal)
      .then((config) => {
        if (closed) return
        stunServers = config.iceServers
        relayAvailable = config.relayAvailable
        sync()
        for (const item of early.splice(0)) void handle(item.from, item.signal)
      })
      .catch(() => {
        // Aborted: the effect is being torn down.
      })

    return () => {
      closed = true
      controller.abort()
      unsubscribe()
      syncRef.current = null
      applyLocalRef.current = null
      for (const id of [...peers.keys()]) closePeer(id)
      setPreviews(new Map())
    }
  }, [enabled, me])

  return previews
}
