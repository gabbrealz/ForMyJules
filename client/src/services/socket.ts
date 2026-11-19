import { WS_URL } from "#config/env"
import { HttpError, http } from "#services/http-client"
import { SocketClient } from "./socket-client.ts"

export type {
  BinaryHandler,
  MessageHandler,
  SocketStatus,
} from "./socket-client.ts"

// Must match WS_PATH on the server (sockets/constants.ts).
const WS_PATH = "/ws"

// The same call the auth feature makes to restore a session.
async function isSessionValid(): Promise<boolean> {
  try {
    await http.get("/api/auth/me")
    return true
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) return false
    throw error
  }
}

/** The app's one WebSocket. Use it through a feature's own channel, not directly. */
export const socket = new SocketClient({
  url: `${WS_URL.replace(/\/$/, "")}${WS_PATH}`,
  checkSession: isSessionValid,
})
