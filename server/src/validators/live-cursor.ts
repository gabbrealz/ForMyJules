import { z } from 'zod';

export const ANCHOR_REGEX = /^[a-z0-9_-]{1,32}$/i;

// Clamp to [0, 1] and round to 4 decimals. `.finite()` matters because JSON.parse('1e999') is Infinity.
const unit = z
  .number()
  .finite()
  .transform((v) => Math.round(Math.min(1, Math.max(0, v)) * 10_000) / 10_000);

const anchoredMove = z.object({
  t: z.literal('m'),
  a: z.string().regex(ANCHOR_REGEX),
  x: unit,
  y: unit,
  fx: unit,
  fy: unit,
});

const freeMove = z.object({
  t: z.literal('m'),
  a: z.null(),
  fx: unit,
  fy: unit,
});

const leave = z.object({ t: z.literal('leave') });

// Unknown keys (including the `f` envelope field) are stripped.
export const cursorMessageSchema = z.union([anchoredMove, freeMove, leave]);
