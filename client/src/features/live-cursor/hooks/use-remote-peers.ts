import { useEffect, useState, useSyncExternalStore } from "react"
import { cursorChannel } from "../services/cursor-channel.ts"
import { PeerStore } from "../services/peer-store.ts"
import type { Peer } from "../types.ts"

/**
 * The other people's cursors. The list re-renders React only when someone joins
 * or leaves; positions are read by the animation loop (see CursorAnimator).
 *
 * `connected` is whether the socket is open. Peers are dropped when it isn't,
 * because the server sends a fresh snapshot on every reconnect.
 */
export function useRemotePeers(connected: boolean): readonly Peer[] {
  const [store] = useState(() => new PeerStore())

  // Subscribe for the whole life of the component, not only while connected:
  // the server's snapshot can arrive before React has re-rendered with "open".
  useEffect(
    () => cursorChannel.subscribe((message) => store.apply(message)),
    [store],
  )

  useEffect(() => {
    if (!connected) store.clear()
  }, [connected, store])

  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
