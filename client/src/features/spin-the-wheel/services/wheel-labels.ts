import { WHEEL_FONT_FAMILY } from "../constants"
import type { Entry } from "../types"
import { TAU } from "../utils"

export interface LabelLayout {
  /** Identifies the inputs the layout was computed for, so it can be reused. */
  key: string
  fontSize: number
  labels: string[]
}

export type LabelCache = { current: LabelLayout | null }

export const wheelFont = (px: number) => `700 ${px}px ${WHEEL_FONT_FAMILY}`

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let end = text.length
  while (
    end > 1 &&
    ctx.measureText(`${text.slice(0, end).trimEnd()}…`).width > maxWidth
  ) {
    end--
  }
  return `${text.slice(0, end).trimEnd()}…`
}

export function layoutLabels(
  ctx: CanvasRenderingContext2D,
  entries: Entry[],
  radius: number,
  key: string
): LabelLayout {
  const step = TAU / entries.length
  // ~half of the slice's arc length at 70% radius, capped so short lists don't get huge text.
  const fontSize = Math.min(radius * 0.11, step * radius * 0.35)
  ctx.font = wheelFont(fontSize)
  const maxWidth = radius * 0.6
  return {
    key,
    fontSize,
    labels: entries.map((entry) => truncate(ctx, entry.label, maxWidth)),
  }
}
