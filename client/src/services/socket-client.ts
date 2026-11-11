/**
 * One shared, reference-counted WebSocket for the whole app.
 *
 * Features never open sockets themselves. They `retain()` the connection while
 * they are mounted, `subscribe()` to the messages of their own namespace and
 * `send()` messages tagged with it. Every message is a JSON object whose `f`
 * field names the feature, e.g. { f: "cursor", t: "m", ... }; the server routes
 * on the same field.
 */

export type SocketStatus =
  | "idle" // nobody needs the connection
  | "connecting" // first attempt
  | "open"
  | "reconnecting" // waiting to retry, or retrying
  | "unauthorized" // the session is gone; retrying is pointless

export type MessageHandler = (message: unknown) => void

export type SocketClientOptions = {
  /** Full ws:// or wss:// URL, including the path. */
  url: string
  /**
   * Browsers hide the handshake's HTTP status, so a socket that closes before it
   * ever opens could mean a lost session (401) or just a server that is down.
   * This asks the HTTP API: resolve true when the session is still valid, false
   * when it's gone, and reject when that can't be told (the client then keeps
   * backing off).
   */
  checkSession: () => Promise<boolean>
}

/** The server closes with this code when a session is revoked while connected. */
const CLOSE_UNAUTHORIZED = 4401

/**
 * How long an unused connection is kept before closing. It lets React
 * StrictMode's remount, and a move between two pages that use the socket, reuse
 * the connection instead of reconnecting.
 */
const IDLE_CLOSE_DELAY_MS = 300

const BACKOFF_BASE_MS = 500
const BACKOFF_MAX_MS = 15_000

/** Exponential backoff with "equal jitter": half fixed, half random, so clients never retry in lockstep. */
function backoffDelay(attempt: number): number {
  const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** attempt)
  return ceiling / 2 + Math.random() * (ceiling / 2)
}

export class SocketClient {
  private readonly options: SocketClientOptions
  private socket: WebSocket | null = null
  private status: SocketStatus = "idle"
  private retainCount = 0
  private attempt = 0
  /** Bumped by shutdown() so async work started for an older connection can tell it is stale. */
  private generation = 0
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private idleTimer: ReturnType<typeof setTimeout> | undefined
  private readonly handlers = new Map<string, Set<MessageHandler>>()
  private readonly statusListeners = new Set<() => void>()
  private readonly unauthorizedListeners = new Set<() => void>()

  constructor(options: SocketClientOptions) {
    this.options = options
  }

  // Arrow properties so they can be handed straight to useSyncExternalStore.
  readonly getStatus = (): SocketStatus => this.status

  readonly onStatusChange = (listener: () => void): (() => void) => {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  /** Called when the server says the session is gone. */
  readonly onUnauthorized = (listener: () => void): (() => void) => {
    this.unauthorizedListeners.add(listener)
    return () => {
      this.unauthorizedListeners.delete(listener)
    }
  }

  /**
   * Asks for the connection to stay open. Returns a function that gives it back;
   * the socket closes shortly after the last holder lets go.
   */
  retain(): () => void {
    this.retainCount += 1
    clearTimeout(this.idleTimer)
    if (this.status === "idle" || this.status === "unauthorized") this.connect()

    let released = false
    return () => {
      if (released) return
      released = true
      this.release()
    }
  }

  /** Listens to the messages whose `f` field equals `feature`. The payload is unvalidated. */
  subscribe(feature: string, handler: MessageHandler): () => void {
    let set = this.handlers.get(feature)
    if (!set) {
      set = new Set()
      this.handlers.set(feature, set)
    }
    set.add(handler)
    return () => {
      set.delete(handler)
    }
  }

  /** Returns false (and drops the message) when the socket isn't open. */
  send(message: { readonly f: string }): boolean {
    const { socket } = this
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify(message))
    return true
  }

  private release(): void {
    this.retainCount -= 1
    if (this.retainCount > 0) return
    this.idleTimer = setTimeout(() => {
      if (this.retainCount === 0) this.shutdown()
    }, IDLE_CLOSE_DELAY_MS)
  }

  private connect(): void {
    this.setStatus(this.attempt === 0 ? "connecting" : "reconnecting")

    const socket = new WebSocket(this.options.url)
    this.socket = socket
    let opened = false

    // `this.socket !== socket` means this socket was replaced or closed on purpose.
    socket.onopen = () => {
      if (this.socket !== socket) return
      opened = true
      this.attempt = 0
      this.setStatus("open")
    }
    socket.onmessage = (event) => {
      if (this.socket === socket) this.dispatch(event.data)
    }
    socket.onclose = (event) => {
      if (this.socket !== socket) return
      this.socket = null
      void this.handleClose(opened, event.code)
    }
    // 'error' is always followed by 'close', which does the work.
  }

  private async handleClose(opened: boolean, code: number): Promise<void> {
    if (code === CLOSE_UNAUTHORIZED) {
      this.markUnauthorized()
      return
    }
    if (opened) {
      this.scheduleRetry()
      return
    }

    // Never opened: find out whether the session is the reason.
    const generation = this.generation
    this.setStatus("reconnecting")
    let valid = true
    try {
      valid = await this.options.checkSession()
    } catch {
      // Can't tell (server unreachable): keep backing off.
    }
    if (generation !== this.generation) return

    if (valid) this.scheduleRetry()
    else this.markUnauthorized()
  }

  private scheduleRetry(): void {
    this.setStatus("reconnecting")
    const delay = backoffDelay(this.attempt)
    this.attempt += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      this.connect()
    }, delay)
  }

  private markUnauthorized(): void {
    this.attempt = 0
    this.setStatus("unauthorized")
    for (const listener of this.unauthorizedListeners) listener()
  }

  private shutdown(): void {
    this.generation += 1
    clearTimeout(this.retryTimer)
    this.retryTimer = undefined
    const { socket } = this
    this.socket = null
    socket?.close(1000)
    this.attempt = 0
    this.setStatus("idle")
  }

  private dispatch(data: unknown): void {
    if (typeof data !== "string") return

    let message: unknown
    try {
      message = JSON.parse(data)
    } catch {
      return
    }
    if (typeof message !== "object" || message === null) return

    const feature = (message as { f?: unknown }).f
    if (typeof feature !== "string") return

    for (const handler of this.handlers.get(feature) ?? []) {
      // One misbehaving feature must not stop the others from getting the message.
      try {
        handler(message)
      } catch (error) {
        console.error(`[socket] "${feature}" handler failed`, error)
      }
    }
  }

  private setStatus(next: SocketStatus): void {
    if (this.status === next) return
    this.status = next
    for (const listener of this.statusListeners) listener()
  }
}
