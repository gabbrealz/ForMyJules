import type { WebSocket } from 'ws';
import type { PublicUser, UserRole } from '../models/user';

export interface SocketConnection {
  readonly id: number;
  readonly ws: WebSocket;
  /** Resolved from the session at upgrade time. Never taken from client messages. */
  readonly user: PublicUser;
  isAlive: boolean;
  strikes: number;
  tokens: number;
  refilledAt: number;
  /** Budget for incoming binary bytes (see WS_BYTE_BUCKET_*). */
  byteTokens: number;
  byteRefilledAt: number;
}

/**
 * A feature owns one namespace on the shared socket. Every message is an object with an `f`
 * field naming its feature: { f: 'cursor', t: 'm', ... }.
 *
 * To add a feature (pet game, presence, ...): implement this, then add it to `features`
 * in sockets/index.ts. Keep per-feature state inside the feature module.
 */
export interface SocketFeature {
  /** Value of the `f` field on every message belonging to this feature. */
  readonly name: string;
  /** Roles allowed to use the feature. Omit to allow any approved user. */
  readonly roles?: readonly UserRole[];
  /** Largest text message accepted. Defaults to WS_MAX_TEXT_BYTES. */
  readonly maxTextBytes?: number;
  /**
   * Largest binary frame accepted (header included). Leave it out and binary frames for this
   * feature are refused. Set it together with `onBinary`.
   */
  readonly maxBinaryBytes?: number;
  onConnect?(conn: SocketConnection): void;
  /** `message` is parsed JSON of unknown shape: validate it. */
  onMessage(conn: SocketConnection, message: unknown): void;
  /**
   * `header` is parsed JSON of unknown shape: validate it. `payload` is a view into the received
   * frame, so copy it if it must outlive this call.
   */
  onBinary?(conn: SocketConnection, header: unknown, payload: Buffer): void;
  onClose?(conn: SocketConnection): void;
}
