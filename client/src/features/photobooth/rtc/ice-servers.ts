import { http } from "#services/http-client"

// Used when the server can't be asked. STUN alone connects most home networks directly; a network
// that blocks peer-to-peer needs the TURN relay the server normally adds.
const FALLBACK: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }]

/**
 * ICE servers for the live previews, from the server (STUN, plus TURN credentials when it has
 * them). Never throws: a failed request gives the STUN-only fallback, so previews still have a
 * chance rather than none.
 */
export async function fetchIceServers(
  signal?: AbortSignal,
): Promise<RTCIceServer[]> {
  try {
    const { iceServers } = await http.get<{ iceServers: RTCIceServer[] }>(
      "/api/rtc/ice-servers",
      { signal },
    )
    return Array.isArray(iceServers) && iceServers.length > 0
      ? iceServers
      : FALLBACK
  } catch (error) {
    if (signal?.aborted) throw error
    console.warn("Couldn't get ICE servers; using STUN only.", error)
    return FALLBACK
  }
}
