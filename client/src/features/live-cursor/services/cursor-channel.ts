import { socket } from "#services/socket"
import { CURSOR_FEATURE } from "../constants.ts"
import { parseCursorMessage } from "../protocol.ts"
import type { CursorClientMessage, CursorServerMessage } from "../types.ts"

/** The cursor feature's typed view of the shared socket. */
export const cursorChannel = {
  /** Returns false when the socket isn't open (the message is dropped). */
  send: (message: CursorClientMessage): boolean => socket.send(message),

  /** Only well-formed cursor messages reach `onMessage`. */
  subscribe(onMessage: (message: CursorServerMessage) => void): () => void {
    return socket.subscribe(CURSOR_FEATURE, (raw) => {
      const message = parseCursorMessage(raw)
      if (message) onMessage(message)
    })
  },
}
