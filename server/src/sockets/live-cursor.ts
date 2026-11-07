import type { PublicUser } from '../models/user';
import { cursorMessageSchema } from '../validators/live-cursor';
import { CURSOR_MIN_INTERVAL_MS } from './constants';
import { send, strike } from './hub';
import type { CursorPos, CursorServerMessage, CursorShape, CursorUser } from './live-cursor.types';
import type { SocketConnection, SocketFeature } from './types';

const FEATURE = 'cursor' as const;

// --- Cursor styles ------------------------------------------------------------------------
// One style per connected user. A user on two devices shares a style; different users get
// different ones (admin and partner are pinned to slots 0 and 1, so they never collide).

interface CursorStyle {
  shape: CursorShape;
  color: string;
}

const STYLES: [CursorStyle, ...CursorStyle[]] = [
  { shape: 'triangle', color: '#ff5d8f' },
  { shape: 'diamond', color: '#3a86ff' },
  { shape: 'circle', color: '#ffbe0b' },
  { shape: 'square', color: '#2ec4b6' },
];

const stylesByUser = new Map<string, { style: CursorStyle; refs: number }>();

function acquireStyle(user: PublicUser): CursorStyle {
  const existing = stylesByUser.get(user.id);
  if (existing) {
    existing.refs += 1;
    return existing.style;
  }

  const hash = Number.parseInt(user.id.slice(-6), 16) || 0;
  const preferred = user.role === 'admin' ? 0 : user.role === 'partner' ? 1 : hash % STYLES.length;
  const ordered = [...STYLES.slice(preferred), ...STYLES.slice(0, preferred)];
  const inUse = new Set([...stylesByUser.values()].map((entry) => entry.style));
  const style = ordered.find((candidate) => !inUse.has(candidate)) ?? STYLES[0];

  stylesByUser.set(user.id, { style, refs: 1 });
  return style;
}

function releaseStyle(userId: string): void {
  const entry = stylesByUser.get(userId);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) stylesByUser.delete(userId);
}

// --- Peers --------------------------------------------------------------------------------

interface Peer {
  conn: SocketConnection;
  user: CursorUser;
  pos: CursorPos | null;
  /** True while other clients know about this peer (between join and leave). */
  announced: boolean;
  lastMoveAt: number;
}

const peers = new Map<number, Peer>();

const encode = (message: CursorServerMessage): string => JSON.stringify(message);

function broadcast(from: Peer, json: string): void {
  for (const peer of peers.values()) {
    if (peer !== from) send(peer.conn, json);
  }
}

function announce(peer: Peer): void {
  peer.announced = true;
  broadcast(peer, encode({ f: FEATURE, t: 'join', id: peer.conn.id, user: peer.user }));
}

function hide(peer: Peer): void {
  if (!peer.announced) return;
  peer.announced = false;
  peer.pos = null;
  broadcast(peer, encode({ f: FEATURE, t: 'leave', id: peer.conn.id }));
}

// --- Feature ------------------------------------------------------------------------------

export const liveCursor: SocketFeature = {
  name: FEATURE,
  roles: ['admin', 'partner'], // guests are view-only

  onConnect(conn) {
    const style = acquireStyle(conn.user);
    const user: CursorUser = { name: conn.user.nickname, ...style };

    const snapshot = [...peers.values()]
      .filter((peer) => peer.announced)
      .map((peer) => ({ id: peer.conn.id, user: peer.user, pos: peer.pos }));
    send(conn, encode({ f: FEATURE, t: 'snap', peers: snapshot }));

    const peer: Peer = { conn, user, pos: null, announced: false, lastMoveAt: 0 };
    peers.set(conn.id, peer);
    announce(peer);
  },

  onMessage(conn, raw) {
    const peer = peers.get(conn.id);
    if (!peer) return;

    const parsed = cursorMessageSchema.safeParse(raw);
    if (!parsed.success) {
      strike(conn);
      return;
    }
    const msg = parsed.data;

    if (msg.t === 'leave') {
      hide(peer);
      return;
    }

    // Backstop for clients that ignore their own throttle. Dropped, not a strike.
    const now = Date.now();
    if (now - peer.lastMoveAt < CURSOR_MIN_INTERVAL_MS) return;
    peer.lastMoveAt = now;

    const pos: CursorPos =
      msg.a === null
        ? { a: null, fx: msg.fx, fy: msg.fy }
        : { a: msg.a, x: msg.x, y: msg.y, fx: msg.fx, fy: msg.fy };
    peer.pos = pos;

    // Coming back after a `leave`: re-announce so receivers know this peer's style again.
    if (!peer.announced) announce(peer);

    broadcast(peer, encode({ f: FEATURE, t: 'm', id: conn.id, ...pos }));
  },

  onClose(conn) {
    const peer = peers.get(conn.id);
    if (!peer) return;
    hide(peer);
    peers.delete(conn.id);
    releaseStyle(conn.user.id);
  },
};
