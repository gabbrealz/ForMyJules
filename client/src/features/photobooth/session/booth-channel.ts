import { socket } from "#services/socket"

import {
  BOOTH_FEATURE,
  parseBoothMessage,
  parseStillHeader,
} from "./protocol"
import type {
  BoothClientMessage,
  BoothServerMessage,
  BoothStillClientHeader,
  BoothStillServerHeader,
} from "./types"

/** The photobooth's typed view of the shared socket. */
export const boothChannel = {
  /** Returns false when the socket isn't open (the message is dropped). */
  send: (message: BoothClientMessage): boolean => socket.send(message),

  /** Returns false when the socket isn't open (the still is dropped). */
  sendStill: (header: BoothStillClientHeader, image: Blob): boolean =>
    socket.sendBinary(header, image),

  /** Bytes still waiting to be sent: hold back big sends until it drains. */
  bufferedAmount: (): number => socket.getBufferedAmount(),

  /** Only well-formed booth messages reach `onMessage`. */
  subscribe(onMessage: (message: BoothServerMessage) => void): () => void {
    return socket.subscribe(BOOTH_FEATURE, (raw) => {
      const message = parseBoothMessage(raw)
      if (message) onMessage(message)
    })
  },

  /** Only well-formed stills reach `onStill`. The bytes are copied, so they can be kept. */
  subscribeStills(
    onStill: (header: BoothStillServerHeader, image: Blob) => void,
  ): () => void {
    return socket.subscribeBinary(BOOTH_FEATURE, (raw, payload) => {
      const header = parseStillHeader(raw)
      if (!header || payload.length === 0) return
      onStill(header, new Blob([payload.slice()], { type: header.mime }))
    })
  },
}
