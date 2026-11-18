import { WS_MAX_BINARY_BYTES, WS_MAX_TEXT_CEILING_BYTES } from './constants';

// Tuning values for the multiplayer photobooth (plan: multiplayer-photobooth-plan.md).
// Numbers marked "starting value" are untested guesses that Phase 0 replaces with measurements.

export const BOOTH_MAX_MEMBERS = 4;

// The lobby cannot begin with fewer people than this.
export const BOOTH_MIN_MEMBERS = 2;

// --- Catalog -------------------------------------------------------------------------------
// Mirrors LAYOUTS, FILTERS and INTERVALS in client/src/features/photobooth/constants.ts.
// The server needs them to validate the leader's choices and to know how many shots a round has.
// If you add or rename one on the client, change it here too.

export const BOOTH_LAYOUT_IDS = [
  'single',
  'duo',
  'strip',
  'classic-strip',
  'grid',
  'grid-4x2',
] as const;
export type BoothLayoutId = (typeof BOOTH_LAYOUT_IDS)[number];

export const BOOTH_LAYOUT_SHOTS: Record<BoothLayoutId, number> = {
  single: 1,
  duo: 2,
  strip: 3,
  'classic-strip': 4,
  grid: 6,
  'grid-4x2': 8,
};

export const BOOTH_MAX_SHOTS = Math.max(...Object.values(BOOTH_LAYOUT_SHOTS));

export const BOOTH_FILTER_IDS = ['none', 'mono', 'sepia', 'vintage', 'vivid', 'cinematic'] as const;

export const BOOTH_INTERVAL_IDS = ['three', 'five', 'seven', 'nine'] as const;
export type BoothIntervalId = (typeof BOOTH_INTERVAL_IDS)[number];

// Note: the client's 'nine' interval is 10 seconds.
export const BOOTH_INTERVAL_MS: Record<BoothIntervalId, number> = {
  three: 3_000,
  five: 5_000,
  seven: 7_000,
  nine: 10_000,
};

export const BOOTH_DEFAULT_FRAME_COLOR = '#ffffff';

// --- Countdown -----------------------------------------------------------------------------

// How far in the future the server puts the start of the timeline, so every client has time
// to receive it before the first countdown tick (starting value).
export const BOOTH_START_LEAD_MS = 1_500;

// A still can arrive a little before the server's clock reaches its shot's capture time, because
// clocks are only synced to ~50 ms. Allow that much slack before calling a still "too early".
export const BOOTH_STILL_EARLY_TOLERANCE_MS = 500;

// --- Limits --------------------------------------------------------------------------------

// Sends of one still per shot (the first try plus retries) before the server stops relaying.
export const BOOTH_MAX_STILL_ATTEMPTS_PER_SHOT = 3;

// How many times the leader may share a final image in one round (re-sharing after a frame colour change).
export const BOOTH_MAX_FINAL_SHARES = 5;

// A member may ask for the final image again at most this often.
export const BOOTH_FINAL_GET_MIN_INTERVAL_MS = 1_000;

// A save claim that is never finished (closed tab, failed upload) is released after this long,
// so somebody else can save.
export const BOOTH_SAVE_CLAIM_TIMEOUT_MS = 2 * 60 * 1000;

// Cap on one SDP blob. Real offers for one video track are a few KB.
export const BOOTH_MAX_SDP_CHARS = 12_000;

// Text messages may carry an SDP, so they get the full text ceiling.
export const BOOTH_MAX_TEXT_BYTES = WS_MAX_TEXT_CEILING_BYTES;

// Stills and the final image share the socket-wide binary cap.
export const BOOTH_MAX_BINARY_BYTES = WS_MAX_BINARY_BYTES;
