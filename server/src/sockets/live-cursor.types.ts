// Pure types for the live-cursor wire protocol. No imports, so this file can be copied
// as-is into the client (e.g. client/src/features/live-cursor/types.ts).

export type CursorShape = 'triangle' | 'diamond' | 'circle' | 'square';

export interface CursorUser {
  name: string;
  color: string;
  shape: CursorShape;
}

/** Anchored position, or page-level only when the pointer is not over an anchor (a: null). */
export type CursorPos =
  | { a: string; x: number; y: number; fx: number; fy: number }
  | { a: null; fx: number; fy: number };

export type CursorClientMessage =
  | ({ f: 'cursor'; t: 'm' } & CursorPos)
  | { f: 'cursor'; t: 'leave' };

export type CursorServerMessage =
  | {
      f: 'cursor';
      t: 'snap';
      peers: { id: number; user: CursorUser; pos: CursorPos | null }[];
    }
  | { f: 'cursor'; t: 'join'; id: number; user: CursorUser }
  | ({ f: 'cursor'; t: 'm'; id: number } & CursorPos)
  | { f: 'cursor'; t: 'leave'; id: number };
