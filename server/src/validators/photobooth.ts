import { z } from 'zod';
import {
  BOOTH_FILTER_IDS,
  BOOTH_INTERVAL_IDS,
  BOOTH_LAYOUT_IDS,
  BOOTH_MAX_SDP_CHARS,
  BOOTH_MAX_SHOTS,
} from '../sockets/photobooth.constants';

// Message ids are socket connection ids: positive integers.
const memberId = z.int().min(1);
const shotIndex = z.int().min(0).max(BOOTH_MAX_SHOTS - 1);

// Lowercase hex, so it compares cleanly with <input type="color"> values on the client.
const hexColor = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Invalid colour')
  .transform((value) => value.toLowerCase());

// Every field is optional; at least one must be present. Unknown keys are stripped.
const configPatchSchema = z
  .object({
    layoutId: z.enum(BOOTH_LAYOUT_IDS).optional(),
    scene: z.enum(['one-scene', 'separate-cells']).optional(),
    intervalId: z.enum(BOOTH_INTERVAL_IDS).optional(),
    removeBackground: z.boolean().optional(),
    filterId: z.enum(BOOTH_FILTER_IDS).optional(),
    frameColor: hexColor.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Empty patch' });

const rtcSignalSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('description'),
    type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
    sdp: z.string().max(BOOTH_MAX_SDP_CHARS).optional(), // a rollback has no SDP
  }),
  z.object({
    kind: z.literal('candidate'),
    candidate: z.string().max(512), // '' marks the end of candidates
    sdpMid: z.string().max(64).nullish(),
    sdpMLineIndex: z.int().min(0).max(255).nullish(),
    usernameFragment: z.string().max(64).nullish(),
  }),
]);

// The `f` envelope field is stripped.
export const boothMessageSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('join') }),
  z.object({ t: z.literal('leave') }),
  z.object({ t: z.literal('sync'), c: z.number().finite() }),
  z.object({ t: z.literal('ready'), ready: z.boolean() }),
  z.object({ t: z.literal('config'), patch: configPatchSchema }),
  z.object({
    t: z.literal('go'),
    step: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  }),
  z.object({ t: z.literal('start') }),
  z.object({ t: z.literal('stop') }),
  z.object({ t: z.literal('continue') }),
  z.object({ t: z.literal('retake') }),
  z.object({ t: z.literal('new-round') }),
  z.object({ t: z.literal('still-ack'), from: memberId, shot: shotIndex }),
  z.object({ t: z.literal('final-get'), id: z.int().min(1) }),
  z.object({ t: z.literal('save-claim') }),
  z.object({ t: z.literal('save-done') }),
  z.object({ t: z.literal('save-fail') }),
  z.object({ t: z.literal('rtc'), to: memberId, signal: rtcSignalSchema }),
]);

// Headers of binary frames (the `f` field is stripped here too).
export const boothBinaryHeaderSchema = z.discriminatedUnion('t', [
  z.object({
    t: z.literal('still'),
    shot: shotIndex,
    mime: z.enum(['image/png', 'image/webp']),
  }),
  z.object({
    t: z.literal('final'),
    mime: z.enum(['image/png', 'image/webp', 'image/jpeg']),
  }),
]);

export type BoothMessage = z.infer<typeof boothMessageSchema>;
export type BoothBinaryHeader = z.infer<typeof boothBinaryHeaderSchema>;
export type BoothConfigPatchInput = z.infer<typeof configPatchSchema>;
