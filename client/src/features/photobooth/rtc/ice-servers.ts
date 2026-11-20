import { http } from "#services/http-client"

// Used when the server can't be asked. STUN alone connects most home networks directly.
const FALLBACK: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }]

export type IceConfig = {
  /** Free STUN servers: used for the first, direct attempt. */
  iceServers: RTCIceServer[]
  /** Whether the server has a TURN relay to fall back to. */
  relayAvailable: boolean
}

/**
 * The free tier, from the server: STUN servers, and whether a relay exists. Never throws (unless
 * aborted): a failed request gives STUN only, so previews still have a chance rather than none.
 */
export async function fetchIceConfig(signal?: AbortSignal): Promise<IceConfig> {
  try {
    const { iceServers, relayAvailable } = await http.get<{
      iceServers: RTCIceServer[]
      relayAvailable?: boolean
    }>("/api/rtc/ice-servers", { signal })
    return {
      iceServers:
        Array.isArray(iceServers) && iceServers.length > 0
          ? iceServers
          : FALLBACK,
      relayAvailable: relayAvailable === true,
    }
  } catch (error) {
    if (signal?.aborted) throw error
    console.warn("Couldn't get ICE servers; using STUN only.", error)
    return { iceServers: FALLBACK, relayAvailable: false }
  }
}

/**
 * The fallback: TURN servers with credentials. Asked for only after a direct connection has
 * failed, because relayed traffic is the one thing here that costs bandwidth. Empty on any failure.
 */
export async function fetchRelayServers(
  signal?: AbortSignal,
): Promise<RTCIceServer[]> {
  try {
    const { iceServers } = await http.get<{ iceServers: RTCIceServer[] }>(
      "/api/rtc/relay-servers",
      { signal },
    )
    return Array.isArray(iceServers) ? iceServers : []
  } catch (error) {
    if (signal?.aborted) throw error
    console.warn("Couldn't get relay servers.", error)
    return []
  }
}
