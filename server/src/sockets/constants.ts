// Tuning values for the WebSocket layer. Client-side values (SEND_INTERVAL_MS, MIN_DELTA,
// SMOOTHING_TAU_MS) live in the client's own constants module.

export const WS_PATH = '/ws';

// Text (JSON) messages. Features get this much unless they declare `maxTextBytes`. Anything over
// the ceiling is dropped before it is parsed.
export const WS_MAX_TEXT_BYTES = 4 * 1024;
export const WS_MAX_TEXT_CEILING_BYTES = 16 * 1024;

// Binary frames (see binary.ts). Refused unless a feature declares `maxBinaryBytes`. Starting
// value for photobooth stills and the final image: Phase 0 of the plan replaces it with a
// measured size. Memory matters on Render's free tier (512 MB), so keep it as small as the
// biggest real image allows.
export const WS_MAX_BINARY_BYTES = 6 * 1024 * 1024;

// Hard cap on a single frame; ws closes the connection (1009) if exceeded. It has to fit the
// largest binary frame, so text is checked separately above.
export const WS_MAX_PAYLOAD_BYTES = WS_MAX_BINARY_BYTES;

// Largest JSON header inside a binary frame.
export const WS_MAX_BINARY_HEADER_BYTES = 1024;

// Per-connection budget for incoming binary bytes: a burst of 32 MiB, 4 MiB/s sustained.
// Frames over budget are dropped, so senders must retry (stills are acknowledged for that).
export const WS_BYTE_BUCKET_CAPACITY = 32 * 1024 * 1024;
export const WS_BYTE_BUCKET_REFILL_PER_SEC = 4 * 1024 * 1024;

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

// `sendReliable` (for messages that must not be dropped, e.g. session state or a photo) only
// gives up when the buffer is this full, which means the peer is effectively gone.
export const WS_MAX_RELIABLE_BUFFERED_BYTES = 24 * 1024 * 1024;

// Application close codes (4000-4999). The client should stop reconnecting on 4401.
export const WS_CLOSE_UNAUTHORIZED = 4401;

// live-cursor: messages arriving faster than this per connection are dropped (~66 Hz max).
export const CURSOR_MIN_INTERVAL_MS = 15;
