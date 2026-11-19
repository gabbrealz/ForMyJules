// Pure types for the multiplayer photobooth wire protocol. No imports, so this file can be
// copied as-is into the client (e.g. client/src/features/photobooth/session/types.ts).
//
// Text messages are JSON objects: { f: 'booth', t: <type>, ... }.
// Binary frames (stills and the final image) are [u16 header length][JSON header][image bytes],
// where the JSON header is { f: 'booth', t: 'still' | 'final', ... } (see sockets/binary.ts).
//
// The server owns the session. It broadcasts the FULL state (`state`) to every member on every
// change; clients never patch it, they only send requests and render what comes back.

export type BoothScene = 'one-scene' | 'separate-cells';

/** Mirrors the stepper: 1 layout, 2 experience, 3 photos, 4 frame. */
export type BoothStep = 1 | 2 | 3 | 4;

/**
 * 'lobby': people are joining and nothing can be configured yet. The leader moves the group into
 * 'flow' (the four steps) with `begin`, once at least 2 people are present. Late joiners after
 * that go straight into the flow. The session returns to 'lobby' only when everyone has left.
 */
export type BoothPhase = 'lobby' | 'flow';

export type BoothRole = 'admin' | 'partner' | 'guest';

export type BoothImageMime = 'image/png' | 'image/webp' | 'image/jpeg';

export interface BoothConfig {
  /** Layout id from the client's LAYOUTS. Null until the leader picks one. */
  layoutId: string | null;
  scene: BoothScene;
  /** Interval id from the client's INTERVALS ('three' | 'five' | 'seven' | 'nine'). */
  intervalId: string;
  /** Always true in 'one-scene' mode. The leader's choice in 'separate-cells'. */
  removeBackground: boolean;
  /** Filter id from the client's FILTERS. One filter, shared by everyone. */
  filterId: string;
  /** Lowercase '#rrggbb'. */
  frameColor: string;
}

export interface BoothMember {
  /**
   * The id of this person's socket connection. It is the id used in WebRTC signalling and on
   * stills. Members are listed in JOIN ORDER, which also decides layering (first = at the back).
   */
  id: number;
  name: string;
  role: BoothRole;
  /** 'waiting' = joined during a round; becomes 'active' when the next round can start. */
  status: 'active' | 'waiting';
  /** Set by the client: clock synced, camera running, tab visible. The round starts only when every active member is ready. */
  ready: boolean;
}

/**
 * The shared timeline. All times are in SERVER time (see `sync`).
 *
 * Shot i (0-based, firstShot <= i < shots) is captured at
 *   captureAt(i) = startAt + (i - firstShot + 1) * intervalMs
 * so the countdown for that shot runs from captureAt(i) - intervalMs to captureAt(i). Clients
 * derive the countdown number from their synced clock; there are no per-second messages.
 * Shots below `firstShot` were taken in an earlier part of the same round (after a `continue`).
 */
export interface BoothRound {
  /** 'complete' once the leader has moved on to the frame step with all shots taken. */
  status: 'running' | 'stopped' | 'complete';
  shots: number;
  intervalMs: number;
  startAt: number;
  firstShot: number;
  stoppedAt: number | null;
  /**
   * Number of shots that exist (indexes 0..taken-1). Decided by the server: after a stop it is
   * the count of shots scheduled at or before `stoppedAt`. Null while running.
   */
  taken: number | null;
  /** Ids of the members taking part in this round. */
  roster: number[];
}

export interface BoothFinal {
  /** Changes every time the leader shares a new final image. */
  id: number;
  mime: BoothImageMime;
  size: number;
  save: {
    status: 'none' | 'saving' | 'saved';
    /** Member id of whoever is saving or saved it. */
    by: number | null;
  };
}

export interface BoothState {
  /** Increases on every change. */
  v: number;
  phase: BoothPhase;
  /** Stays 1 in the lobby. */
  step: BoothStep;
  /** The earliest-joined active member. Null only when the session is empty. */
  leaderId: number | null;
  members: BoothMember[];
  config: BoothConfig;
  /** Null until the leader starts the countdown. */
  round: BoothRound | null;
  final: BoothFinal | null;
}

export type BoothDeniedReason =
  | 'not_member'
  | 'not_leader'
  /** Not allowed while a round is in progress. */
  | 'locked'
  /** Not allowed until the leader has moved the group out of the lobby. */
  | 'in_lobby'
  /** The lobby needs at least 2 people before it can begin. */
  | 'too_few'
  | 'bad_step'
  | 'no_layout'
  | 'not_ready'
  | 'no_round'
  | 'no_final'
  | 'cannot_save'
  | 'busy'
  | 'already_saved'
  | 'limit'
  | 'not_found';

export type BoothConfigPatch = Partial<Omit<BoothConfig, 'layoutId'>> & { layoutId?: string };

/** Where the leader's pointer is. The same shape as the live-cursor feature's CursorPos. */
export type BoothCursorPos =
  | { a: string; x: number; y: number; fx: number; fy: number }
  | { a: null; fx: number; fy: number };

export type BoothRtcSignal =
  | { kind: 'description'; type: 'offer' | 'answer' | 'pranswer' | 'rollback'; sdp?: string }
  | {
      kind: 'candidate';
      /** An empty string marks the end of candidates. */
      candidate: string;
      sdpMid?: string | null;
      sdpMLineIndex?: number | null;
      usernameFragment?: string | null;
    };

// --- Client -> server (text) ---------------------------------------------------------------

export type BoothClientMessage =
  | { f: 'booth'; t: 'join' }
  | { f: 'booth'; t: 'leave' }
  /** Clock sync. `c` is the client's own clock when sending; it is echoed back. */
  | { f: 'booth'; t: 'sync'; c: number }
  | { f: 'booth'; t: 'ready'; ready: boolean }
  // Leader only from here, except where noted.
  /** Leaves the lobby for step 1. Refused with 'too_few' unless at least 2 people are present. */
  | { f: 'booth'; t: 'begin' }
  | { f: 'booth'; t: 'config'; patch: BoothConfigPatch }
  | { f: 'booth'; t: 'go'; step: BoothStep }
  | { f: 'booth'; t: 'start' }
  | { f: 'booth'; t: 'stop' }
  /** After a stop: carry on with the remaining shots (everyone must be ready again). */
  | { f: 'booth'; t: 'continue' }
  /** Throw away this round's shots and final image; back to step 3, ready to start. */
  | { f: 'booth'; t: 'retake' }
  /** From step 4: back to step 1 for another round. */
  | { f: 'booth'; t: 'new-round' }
  /** I have received this member's still. Every receiver sends one. */
  | { f: 'booth'; t: 'still-ack'; from: number; shot: number }
  // Any member from here.
  /** Asks the server to send the current final image again (a relay was dropped, or a reconnect). */
  | { f: 'booth'; t: 'final-get'; id: number }
  /** Only admin and partner. Granted to one member at a time. */
  | { f: 'booth'; t: 'save-claim' }
  | { f: 'booth'; t: 'save-done' }
  | { f: 'booth'; t: 'save-fail' }
  | { f: 'booth'; t: 'rtc'; to: number; signal: BoothRtcSignal }
  /** Leader only: where my pointer is. Relayed to everyone else, and not part of the state. */
  | { f: 'booth'; t: 'cursor'; pos: BoothCursorPos }
  /** Leader only: my pointer left the page. */
  | { f: 'booth'; t: 'cursor-leave' };

// --- Client -> server (binary headers) -----------------------------------------------------

export type BoothBinaryClientHeader =
  /** Anyone's full-quality still for one shot. Relayed to every other member of the round. */
  | { f: 'booth'; t: 'still'; shot: number; mime: 'image/png' | 'image/webp' }
  /** The leader's finished image. Relayed to every other active member. */
  | { f: 'booth'; t: 'final'; mime: BoothImageMime };

// --- Server -> client (text) ---------------------------------------------------------------

export type BoothServerMessage =
  | { f: 'booth'; t: 'joined'; me: number }
  | { f: 'booth'; t: 'refused'; reason: 'full' | 'already_joined' }
  | { f: 'booth'; t: 'state'; state: BoothState }
  /** Reply to `sync`. Offset = s - (c + roundTrip / 2); keep the lowest-round-trip sample. */
  | { f: 'booth'; t: 'sync'; c: number; s: number }
  /** A request was refused. A fresh `state` follows, so the UI can fall back to it. */
  | { f: 'booth'; t: 'denied'; for: string; reason: BoothDeniedReason }
  | { f: 'booth'; t: 'rtc'; from: number; signal: BoothRtcSignal }
  /** The leader's pointer. Lossy: a dropped move is replaced by the next one. */
  | { f: 'booth'; t: 'cursor'; id: number; pos: BoothCursorPos }
  | { f: 'booth'; t: 'cursor-leave'; id: number }
  /** To a still's sender: member `by` has it. Done once every other member has acked. */
  | { f: 'booth'; t: 'still-ack'; shot: number; by: number }
  /** To a still's sender: the server could not hand it to everyone. Retry after a short wait. */
  | { f: 'booth'; t: 'still-failed'; shot: number };

// --- Server -> client (binary headers) -----------------------------------------------------

export type BoothBinaryServerHeader =
  /** To every other member of the round. */
  | { f: 'booth'; t: 'still'; from: number; shot: number; mime: 'image/png' | 'image/webp' }
  | { f: 'booth'; t: 'final'; id: number; mime: BoothImageMime };
