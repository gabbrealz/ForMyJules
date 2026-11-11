import type { CursorServerMessage, Peer } from "../types.ts"

/**
 * Everyone else's cursor, kept outside React.
 *
 * Subscribers are told only when the list of peers changes (join, leave, snapshot,
 * clear). A move just replaces `peer.pos` in place, so a moving cursor never
 * causes a React render: the animation loop reads `pos` every frame instead.
 */
export class PeerStore {
  private peers = new Map<number, Peer>()
  private snapshot: readonly Peer[] = []
  private readonly listeners = new Set<() => void>()

  // Arrow properties so they can be handed straight to useSyncExternalStore.
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** The same array until membership changes. */
  readonly getSnapshot = (): readonly Peer[] => this.snapshot

  apply(message: CursorServerMessage): void {
    switch (message.t) {
      case "snap":
        this.peers = new Map(
          message.peers.map((peer) => [
            peer.id,
            { id: peer.id, user: peer.user, pos: peer.pos },
          ]),
        )
        this.publish()
        break

      case "join":
        this.peers.set(message.id, {
          id: message.id,
          user: message.user,
          pos: null,
        })
        this.publish()
        break

      case "leave":
        if (this.peers.delete(message.id)) this.publish()
        break

      case "m": {
        const peer = this.peers.get(message.id)
        if (!peer) return // a move from someone we haven't been introduced to
        peer.pos =
          message.a === null
            ? { a: null, fx: message.fx, fy: message.fy }
            : {
                a: message.a,
                x: message.x,
                y: message.y,
                fx: message.fx,
                fy: message.fy,
              }
        break
      }
    }
  }

  clear(): void {
    if (this.peers.size === 0) return
    this.peers.clear()
    this.publish()
  }

  private publish(): void {
    this.snapshot = [...this.peers.values()]
    for (const listener of this.listeners) listener()
  }
}
