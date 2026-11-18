import { WS_MAX_BINARY_HEADER_BYTES } from './constants';

// Binary frame layout shared by every feature:
//
//   [ u16 big-endian: header length N ][ N bytes: UTF-8 JSON header ][ rest: raw payload ]
//
// The JSON header always has the feature name in `f`, like text messages ({ f: 'booth', t: 'still', ... }).

export interface BinaryFrame {
  header: unknown;
  payload: Buffer;
}

/** Returns null for anything malformed. Never throws. */
export function decodeBinaryFrame(frame: Buffer): BinaryFrame | null {
  if (frame.length < 2) return null;

  const headerLength = frame.readUInt16BE(0);
  if (headerLength === 0 || headerLength > WS_MAX_BINARY_HEADER_BYTES) return null;
  const payloadStart = 2 + headerLength;
  if (payloadStart > frame.length) return null;

  try {
    const header: unknown = JSON.parse(frame.toString('utf8', 2, payloadStart));
    return { header, payload: frame.subarray(payloadStart) };
  } catch {
    return null;
  }
}

/** Builds a new frame (copies the payload once). */
export function encodeBinaryFrame(header: object, payload: Buffer): Buffer {
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  if (headerBytes.length > WS_MAX_BINARY_HEADER_BYTES) {
    throw new Error('Binary frame header is too large');
  }

  const prefix = Buffer.alloc(2);
  prefix.writeUInt16BE(headerBytes.length, 0);
  return Buffer.concat([prefix, headerBytes, payload]);
}
