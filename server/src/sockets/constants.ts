// Tuning values for the WebSocket layer. Client-side values (SEND_INTERVAL_MS, MIN_DELTA,
// SMOOTHING_TAU_MS) live in the client's own constants module.

export const WS_PATH = '/ws';

// Hard cap on a single frame; ws closes the connection (1009) if exceeded. Raise if a future
// feature needs bigger messages.
export const WS_MAX_PAYLOAD_BYTES = 4 * 1024;

// Render's proxy drops idle connections, so ping well inside its idle timeout.
export const WS_HEARTBEAT_INTERVAL_MS = 30_000;

export const WS_MAX_CONNECTIONS_PER_USER = 5;
export const WS_MAX_CONNECTIONS_TOTAL = 50;

// Per-connection token bucket shared by all features: burst of 120, 90 messages/s sustained.
// Messages over the limit are dropped before they are parsed.
export const WS_BUCKET_CAPACITY = 120;
export const WS_BUCKET_REFILL_PER_SEC = 90;

// Invalid messages tolerated before the connection is closed.
export const WS_MAX_STRIKES = 20;

// Skip sending to a client whose outgoing buffer is this full (slow connection).
export const WS_MAX_BUFFERED_BYTES = 64 * 1024;

// Application close codes (4000-4999). The client should stop reconnecting on 4401.
export const WS_CLOSE_UNAUTHORIZED = 4401;

// live-cursor: messages arriving faster than this per connection are dropped (~66 Hz max).
export const CURSOR_MIN_INTERVAL_MS = 15;
