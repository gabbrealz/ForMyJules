import { WebSocket } from 'ws';
import type { PublicUser } from '../models/user';
import {
  WS_BUCKET_CAPACITY,
  WS_BUCKET_REFILL_PER_SEC,
  WS_CLOSE_UNAUTHORIZED,
  WS_MAX_BUFFERED_BYTES,
  WS_MAX_STRIKES,
} from './constants';
import type { SocketConnection } from './types';

// Shared connection registry. Features import from here to send to or look up connections.
export const connections = new Map<number, SocketConnection>();

let nextId = 1;

export function register(ws: WebSocket, user: PublicUser): SocketConnection {
  const conn: SocketConnection = {
    id: nextId++,
    ws,
    user,
    isAlive: true,
    strikes: 0,
    tokens: WS_BUCKET_CAPACITY,
    refilledAt: Date.now(),
  };
  connections.set(conn.id, conn);
  return conn;
}

export function unregister(conn: SocketConnection): void {
  connections.delete(conn.id);
}

export function countForUser(userId: string): number {
  let count = 0;
  for (const conn of connections.values()) if (conn.user.id === userId) count++;
  return count;
}

/** Sends a pre-serialized message. Silently skips closed or backed-up sockets (lossy by design). */
export function send(conn: SocketConnection, json: string): void {
  const { ws } = conn;
  if (ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > WS_MAX_BUFFERED_BYTES) return;
  ws.send(json);
}

/** Token bucket shared by all features. Returns false when the connection is over its limit. */
export function takeToken(conn: SocketConnection): boolean {
  const now = Date.now();
  const refill = ((now - conn.refilledAt) / 1000) * WS_BUCKET_REFILL_PER_SEC;
  conn.tokens = Math.min(WS_BUCKET_CAPACITY, conn.tokens + refill);
  conn.refilledAt = now;
  if (conn.tokens < 1) return false;
  conn.tokens -= 1;
  return true;
}

/** Records an invalid message; closes the connection after too many. */
export function strike(conn: SocketConnection): void {
  conn.strikes += 1;
  if (conn.strikes >= WS_MAX_STRIKES) conn.ws.close(1008, 'Too many invalid messages');
}

/**
 * Closes every connection of a user. Call from admin routes after demoting, deleting or
 * un-approving an account, since the role is only checked at upgrade time.
 */
export function disconnectUser(userId: string, reason = 'Session ended'): void {
  for (const conn of connections.values()) {
    if (conn.user.id === userId) conn.ws.close(WS_CLOSE_UNAUTHORIZED, reason);
  }
}
