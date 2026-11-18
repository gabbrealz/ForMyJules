import { performance } from 'node:perf_hooks';
import { boothBinaryHeaderSchema, boothMessageSchema } from '../validators/photobooth';
import { encodeBinaryFrame } from './binary';
import * as hub from './hub';
import {
  BOOTH_FINAL_GET_MIN_INTERVAL_MS,
  BOOTH_MAX_BINARY_BYTES,
  BOOTH_MAX_TEXT_BYTES,
  BOOTH_SAVE_CLAIM_TIMEOUT_MS,
} from './photobooth.constants';
import { BoothSession, type Result } from './photobooth-session';
import type {
  BoothBinaryServerHeader,
  BoothDeniedReason,
  BoothImageMime,
  BoothServerMessage,
} from './photobooth.types';
import type { SocketConnection, SocketFeature } from './types';

const FEATURE = 'booth' as const;

// The multiplayer photobooth (plan: multiplayer-photobooth-plan.md). One in-memory session for the
// whole app, no rooms or codes. The server owns the state and sends all of it on every change;
// this file only checks requests, hands them to the session, and delivers the results.
//
// The socket is shared with other features and stays open across pages, so a client takes part
// only after an explicit `join`, and leaves with `leave` (or by disconnecting).
//
// Privacy: stills and the final image are relayed from memory. They are never written to disk,
// and nothing in this file logs them or their contents.

// Monotonic, so the timeline never jumps if the host's clock is adjusted. Clients sync to this.
const serverNow = (): number => Math.round(performance.timeOrigin + performance.now());

const session = new BoothSession(serverNow);

const encode = (message: BoothServerMessage): string => JSON.stringify(message);

function sendTo(id: number, data: string | Buffer): boolean {
  const conn = hub.connections.get(id);
  return conn ? hub.sendReliable(conn, data) : false;
}

function stateJson(): string {
  return encode({ f: FEATURE, t: 'state', state: session.toState() });
}

function broadcastState(): void {
  const json = stateJson();
  for (const id of session.memberIds()) sendTo(id, json);
}

function deny(conn: SocketConnection, op: string, reason: BoothDeniedReason): void {
  hub.sendReliable(conn, encode({ f: FEATURE, t: 'denied', for: op, reason }));
  // Usually a stale screen (the leader changed, a round started): give it the truth to render.
  if (session.isMember(conn.id)) hub.sendReliable(conn, stateJson());
}

/** Runs a session change. Broadcasts if anything changed, or tells the requester why not. */
function apply(conn: SocketConnection, op: string, run: () => Result): boolean {
  const before = session.currentVersion;
  const result = run();
  if (!result.ok) {
    deny(conn, op, result.reason);
    return false;
  }
  if (session.currentVersion !== before) broadcastState();
  syncSaveTimer();
  return true;
}

// --- Save claims ---------------------------------------------------------------------------
// Saving to the gallery goes over HTTP (the existing upload + create-photo routes). The socket only
// decides WHO saves, so the picture is saved once: the first save-claim wins, and the claim is
// released if the claimant fails, leaves, or takes too long.

let saveTimer: { key: string; handle: NodeJS.Timeout } | null = null;

function syncSaveTimer(): void {
  const claim = session.saveClaim();
  const key = claim ? `${claim.finalId}:${claim.by}` : null;
  if (saveTimer?.key === key) return;

  if (saveTimer) clearTimeout(saveTimer.handle);
  saveTimer = null;
  if (!claim || key === null) return;

  const handle = setTimeout(() => {
    saveTimer = null;
    const before = session.currentVersion;
    session.expireSave(claim.finalId, claim.by);
    if (session.currentVersion !== before) broadcastState();
    syncSaveTimer();
  }, BOOTH_SAVE_CLAIM_TIMEOUT_MS);
  handle.unref();
  saveTimer = { key, handle };
}

// --- Membership ----------------------------------------------------------------------------

const lastFinalGetAt = new Map<number, number>();

function join(conn: SocketConnection): void {
  const result = session.join(conn.id, conn.user);
  if (!result.ok) {
    hub.sendReliable(conn, encode({ f: FEATURE, t: 'refused', reason: result.reason }));
    return;
  }

  // `joined` first, so the client knows which member it is before the first state arrives.
  hub.sendReliable(conn, encode({ f: FEATURE, t: 'joined', me: conn.id }));
  if (result.fresh) broadcastState();
  else hub.sendReliable(conn, stateJson()); // joining twice is harmless: just resend the state
}

function leave(conn: SocketConnection): void {
  if (!session.isMember(conn.id)) return;
  lastFinalGetAt.delete(conn.id);
  session.leave(conn.id); // always changes the state for a member
  broadcastState();
  syncSaveTimer();
}

// --- Images --------------------------------------------------------------------------------

// Cheap sanity check that the bytes are the image type the header claims, so the server never
// relays arbitrary data. It does not decode the image.
function hasImageSignature(mime: BoothImageMime, bytes: Buffer): boolean {
  if (bytes.length < 16) return false;
  switch (mime) {
    case 'image/png':
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP';
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
}

function finalFrame(id: number, mime: BoothImageMime, bytes: Buffer): Buffer {
  const header = { f: FEATURE, t: 'final', id, mime } satisfies BoothBinaryServerHeader;
  return encodeBinaryFrame(header, bytes);
}

// --- Feature -------------------------------------------------------------------------------

export const photobooth: SocketFeature = {
  name: FEATURE,
  // Any approved user may take part, guests included. Saving to the gallery is limited to
  // admin and partner inside the session.
  maxTextBytes: BOOTH_MAX_TEXT_BYTES, // room for an SDP
  maxBinaryBytes: BOOTH_MAX_BINARY_BYTES,

  onMessage(conn, raw) {
    const parsed = boothMessageSchema.safeParse(raw);
    if (!parsed.success) {
      hub.strike(conn);
      return;
    }
    const msg = parsed.data;

    switch (msg.t) {
      case 'sync': {
        // Works for any connection, joined or not, so clients can sync before joining.
        hub.sendReliable(conn, encode({ f: FEATURE, t: 'sync', c: msg.c, s: serverNow() }));
        return;
      }
      case 'join':
        join(conn);
        return;
      case 'leave':
        leave(conn);
        return;
      case 'ready':
        apply(conn, 'ready', () => session.setReady(conn.id, msg.ready));
        return;
      case 'config':
        apply(conn, 'config', () => session.patchConfig(conn.id, msg.patch));
        return;
      case 'go':
        apply(conn, 'go', () => session.go(conn.id, msg.step));
        return;
      case 'start':
        apply(conn, 'start', () => session.start(conn.id));
        return;
      case 'stop':
        apply(conn, 'stop', () => session.stop(conn.id));
        return;
      case 'continue':
        apply(conn, 'continue', () => session.continue(conn.id));
        return;
      case 'retake':
        apply(conn, 'retake', () => session.retake(conn.id));
        return;
      case 'new-round':
        apply(conn, 'new-round', () => session.newRound(conn.id));
        return;
      case 'save-claim':
        apply(conn, 'save-claim', () => session.claimSave(conn.id));
        return;
      case 'save-done':
        apply(conn, 'save-done', () => session.finishSave(conn.id));
        return;
      case 'save-fail':
        apply(conn, 'save-fail', () => session.failSave(conn.id));
        return;

      case 'still-ack': {
        // The leader confirms it received a member's still; pass that on so the sender stops retrying.
        if (!session.isLeader(conn.id)) {
          deny(conn, 'still-ack', 'not_leader');
          return;
        }
        if (session.isActiveMember(msg.from)) {
          sendTo(msg.from, encode({ f: FEATURE, t: 'still-ack', shot: msg.shot }));
        }
        return;
      }

      case 'final-get': {
        if (!session.canReceiveFinal(conn.id)) {
          deny(conn, 'final-get', 'not_member');
          return;
        }
        const image = session.finalImage();
        if (!image || image.meta.id !== msg.id) {
          deny(conn, 'final-get', 'not_found');
          return;
        }
        const now = Date.now();
        if (now - (lastFinalGetAt.get(conn.id) ?? 0) < BOOTH_FINAL_GET_MIN_INTERVAL_MS) return;
        lastFinalGetAt.set(conn.id, now);
        sendTo(conn.id, finalFrame(image.meta.id, image.meta.mime, image.bytes));
        return;
      }

      case 'rtc': {
        // Signalling for the peer-to-peer preview. The server only passes it on.
        if (!session.canSignal(conn.id, msg.to)) {
          deny(conn, 'rtc', 'not_member');
          return;
        }
        sendTo(msg.to, encode({ f: FEATURE, t: 'rtc', from: conn.id, signal: msg.signal }));
        return;
      }
    }
  },

  onBinary(conn, rawHeader, payload) {
    const parsed = boothBinaryHeaderSchema.safeParse(rawHeader);
    if (!parsed.success || !hasImageSignature(parsed.data.mime, payload)) {
      hub.strike(conn);
      return;
    }
    const header = parsed.data;

    if (header.t === 'still') {
      // A member's full-quality still goes to the leader only, which composes the final image.
      const check = session.checkStill(conn.id, header.shot);
      if (!check.ok) {
        deny(conn, 'still', check.reason);
        return;
      }

      const leaderId = session.leaderId();
      const relayed =
        leaderId !== null &&
        sendTo(
          leaderId,
          encodeBinaryFrame(
            {
              f: FEATURE,
              t: 'still',
              from: conn.id,
              shot: header.shot,
              mime: header.mime,
            } satisfies BoothBinaryServerHeader,
            payload,
          ),
        );
      // No ack will come, so say so: the sender retries after a short wait.
      if (!relayed) hub.sendReliable(conn, encode({ f: FEATURE, t: 'still-failed', shot: header.shot }));
      return;
    }

    // The leader's finished image: keep one copy in memory and send it to everyone else.
    const shared = apply(conn, 'final', () => session.setFinal(conn.id, header.mime, payload));
    if (!shared) return;

    const image = session.finalImage();
    if (!image) return;
    const frame = finalFrame(image.meta.id, image.meta.mime, image.bytes);
    for (const id of session.finalRecipientIds(conn.id)) sendTo(id, frame);
  },

  onClose(conn) {
    leave(conn);
  },
};
