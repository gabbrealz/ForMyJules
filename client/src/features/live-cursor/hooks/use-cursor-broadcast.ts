import { LEAVE_MESSAGE, moveMessage } from "../protocol.ts"
import { cursorChannel } from "../services/cursor-channel.ts"
import type { CursorPos } from "../types.ts"
import { usePointerBroadcast } from "./use-pointer-broadcast.ts"

const sendMove = (pos: CursorPos): boolean =>
  cursorChannel.send(moveMessage(pos))

const sendLeave = (): void => {
  cursorChannel.send(LEAVE_MESSAGE)
}

/**
 * Sends this person's pointer position to the others over the cursor channel while `active`.
 * Pass `active = false` whenever the socket isn't open. See usePointerBroadcast for how the
 * pointer is captured and throttled.
 */
export function useCursorBroadcast(active: boolean): void {
  usePointerBroadcast({ active, send: sendMove, onLeave: sendLeave })
}
