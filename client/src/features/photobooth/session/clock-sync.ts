// Estimates how far this device's clock is from the server's, so every person in the session can
// derive the same countdown from the same timeline (see BoothRound in ./types).
//
// One sample is a ping/pong over the WebSocket: the client stamps `sentAt`, the server answers with
// its own clock `serverTime`, and the client notes when the answer arrived. Assuming the trip out
// and back take equally long, the server read its clock at sentAt + rtt / 2, so
//   offset = serverTime - (sentAt + rtt / 2).
// The error of one sample is at most rtt / 2, so the sample with the lowest round trip is the most
// trustworthy. Only the last few samples count, so slow drift between the clocks is followed.

export type ClockSample = {
  /** Round trip in ms. */
  rtt: number
  /** serverClock - deviceClock, in ms. */
  offset: number
}

/** How many recent samples are kept. */
const WINDOW = 12

/** A sample slower than this says more about the network than about the clocks. */
const MAX_RTT_MS = 5_000

/**
 * Epoch milliseconds that never jump backwards (unlike Date.now() when the clock is adjusted).
 * The server reads its clock the same way, so both are on the same scale.
 */
const defaultClock = () => performance.timeOrigin + performance.now()

export class ClockSync {
  private readonly clock: () => number
  private samples: ClockSample[] = []

  constructor(clock: () => number = defaultClock) {
    this.clock = clock
  }

  /** The device clock. Stamp outgoing pings with this. */
  now(): number {
    return this.clock()
  }

  /**
   * Call when a pong arrives, with the `c` and `s` it carries. Returns false when the sample was
   * unusable (negative or huge round trip) and so was ignored.
   */
  addSample(sentAt: number, serverTime: number): boolean {
    const rtt = this.clock() - sentAt
    if (!Number.isFinite(rtt) || !Number.isFinite(serverTime)) return false
    if (rtt < 0 || rtt > MAX_RTT_MS) return false

    this.samples.push({ rtt, offset: serverTime - (sentAt + rtt / 2) })
    if (this.samples.length > WINDOW) this.samples.shift()
    return true
  }

  get sampleCount(): number {
    return this.samples.length
  }

  /** The sample with the lowest round trip, or null before the first one. */
  get best(): ClockSample | null {
    let best: ClockSample | null = null
    for (const sample of this.samples) {
      if (best === null || sample.rtt < best.rtt) best = sample
    }
    return best
  }

  /** serverClock - deviceClock. Zero until the first sample. */
  get offset(): number {
    return this.best?.offset ?? 0
  }

  /** The most the estimate can be off by, in ms. Null before the first sample. */
  get accuracy(): number | null {
    return this.best ? this.best.rtt / 2 : null
  }

  /** The server's clock, as far as it can be told. Use it to place the shared timeline. */
  serverNow(): number {
    return this.clock() + this.offset
  }

  reset(): void {
    this.samples = []
  }
}
