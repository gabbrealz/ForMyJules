import { ServerResponse, type IncomingMessage, type Server } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Request, RequestHandler, Response } from 'express';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import { isOriginAllowed } from '../config';
import { User, toPublicUser, type PublicUser } from '../models/user';
import { decodeBinaryFrame } from './binary';
import {
  WS_HEARTBEAT_INTERVAL_MS,
  WS_MAX_CONNECTIONS_PER_USER,
  WS_MAX_CONNECTIONS_TOTAL,
  WS_MAX_PAYLOAD_BYTES,
  WS_MAX_TEXT_BYTES,
  WS_MAX_TEXT_CEILING_BYTES,
  WS_PATH,
} from './constants';
import * as hub from './hub';
import { liveCursor } from './live-cursor';
import { photobooth } from './photobooth';
import type { SocketConnection, SocketFeature } from './types';

export { disconnectUser } from './hub';

// Register new features here. Each one gets its own `f` namespace on the shared socket.
const featureList: SocketFeature[] = [liveCursor, photobooth];
const features = new Map<string, SocketFeature>(featureList.map((f) => [f.name, f]));

const canUse = (feature: SocketFeature, conn: SocketConnection): boolean =>
  feature.roles === undefined || feature.roles.includes(conn.user.role);

// A bug in one feature must never take down the process or other features.
function safely(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error(`[ws] ${label} failed:`, err);
  }
}

function reject(socket: Duplex, status: number, message: string): void {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
}

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

// Runs the same express-session middleware as HTTP routes against the upgrade request.
function readSessionUserId(
  req: IncomingMessage,
  sessionParser: RequestHandler,
): Promise<string | undefined> {
  return new Promise((resolve, rejectPromise) => {
    const expressReq = req as unknown as Request;
    const res = new ServerResponse(req) as unknown as Response;
    sessionParser(expressReq, res, (err?: unknown) => {
      if (err) rejectPromise(err);
      else resolve(expressReq.session?.userId);
    });
  });
}

// Same rule as requireAuth: the user must exist and be approved.
async function authenticate(
  req: IncomingMessage,
  sessionParser: RequestHandler,
): Promise<PublicUser | null> {
  const userId = await readSessionUserId(req, sessionParser);
  if (!userId) return null;

  const user = await User.findById(userId).lean();
  if (!user || user.role === 'pending_approval') return null;
  return toPublicUser(user);
}

export function attachWebSocketServer(server: Server, sessionParser: RequestHandler) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: WS_MAX_PAYLOAD_BYTES,
    // Sized for the largest binary frame; text messages get their own, smaller caps below.
    perMessageDeflate: false, // tiny messages and already-compressed images: only costs CPU and memory
  });

  function onMessage(conn: SocketConnection, data: RawData, isBinary: boolean): void {
    if (!hub.takeToken(conn)) return;
    if (isBinary) onBinary(conn, toBuffer(data));
    else onText(conn, toBuffer(data));
  }

  // Binary frames: [u16 header length][JSON header with `f`][payload]. Only features that declare
  // `maxBinaryBytes` and `onBinary` get them.
  function onBinary(conn: SocketConnection, frame: Buffer): void {
    if (!hub.takeBytes(conn, frame.length)) return; // over budget: dropped, the sender retries

    const decoded = decodeBinaryFrame(frame);
    if (!decoded || typeof decoded.header !== 'object' || decoded.header === null) {
      hub.strike(conn);
      return;
    }

    const { header, payload } = decoded;
    const feature = 'f' in header && typeof header.f === 'string' ? features.get(header.f) : undefined;
    if (!feature?.onBinary || feature.maxBinaryBytes === undefined) {
      hub.strike(conn);
      return;
    }
    if (!canUse(feature, conn)) return;
    if (frame.length > feature.maxBinaryBytes) {
      hub.strike(conn);
      return;
    }

    const { onBinary: handle } = feature;
    safely(`${feature.name}.onBinary`, () => handle.call(feature, conn, header, payload));
  }

  function onText(conn: SocketConnection, raw: Buffer): void {
    if (raw.length > WS_MAX_TEXT_CEILING_BYTES) {
      hub.strike(conn);
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      hub.strike(conn);
      return;
    }

    if (typeof message !== 'object' || message === null || !('f' in message)) {
      hub.strike(conn);
      return;
    }

    const feature = typeof message.f === 'string' ? features.get(message.f) : undefined;
    if (!feature) {
      hub.strike(conn);
      return;
    }
    if (!canUse(feature, conn)) return;
    if (raw.length > (feature.maxTextBytes ?? WS_MAX_TEXT_BYTES)) {
      hub.strike(conn);
      return;
    }

    safely(`${feature.name}.onMessage`, () => feature.onMessage(conn, message));
  }

  function accept(ws: WebSocket, user: PublicUser): void {
    const conn = hub.register(ws, user);

    ws.on('message', (data, isBinary) => onMessage(conn, data, isBinary));
    ws.on('pong', () => {
      conn.isAlive = true;
    });
    ws.on('error', () => ws.terminate()); // 'close' follows
    ws.on('close', () => {
      hub.unregister(conn);
      for (const feature of features.values()) {
        if (canUse(feature, conn)) safely(`${feature.name}.onClose`, () => feature.onClose?.(conn));
      }
    });

    for (const feature of features.values()) {
      if (canUse(feature, conn)) safely(`${feature.name}.onConnect`, () => feature.onConnect?.(conn));
    }
  }

  async function upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname !== WS_PATH) return reject(socket, 404, 'Not Found');

    // WebSockets are not covered by CORS, so check Origin ourselves, with the same rule as CORS.
    if (!isOriginAllowed(req.headers.origin ?? '')) return reject(socket, 403, 'Forbidden');
    if (hub.connections.size >= WS_MAX_CONNECTIONS_TOTAL) {
      return reject(socket, 503, 'Service Unavailable');
    }

    const user = await authenticate(req, sessionParser);
    if (!user) return reject(socket, 401, 'Unauthorized');
    if (hub.countForUser(user.id) >= WS_MAX_CONNECTIONS_PER_USER) {
      return reject(socket, 429, 'Too Many Requests');
    }

    wss.handleUpgrade(req, socket, head, (ws) => accept(ws, user));
  }

  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => socket.destroy());
    upgrade(req, socket, head).catch((err) => {
      console.error('[ws] upgrade failed:', err);
      reject(socket, 500, 'Internal Server Error');
    });
  });

  // Render's proxy drops idle connections, and half-open sockets never fire 'close' on their own.
  const heartbeat = setInterval(() => {
    for (const conn of hub.connections.values()) {
      if (!conn.isAlive) {
        conn.ws.terminate();
        continue;
      }
      conn.isAlive = false;
      conn.ws.ping();
    }
  }, WS_HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  return {
    close(): void {
      clearInterval(heartbeat);
      for (const conn of hub.connections.values()) conn.ws.close(1001, 'Server restarting');
      wss.close();
    },
  };
}
