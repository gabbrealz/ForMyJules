import {
  BORDER_AMPLITUDE,
  BORDER_BAND,
  BORDER_FILL,
  BORDER_WAVES,
  EMPTY_WHEEL_COLOR,
  LABEL_COLOR,
  SEPARATOR_COLOR,
  WHEEL_EDGE_MARGIN,
  getSliceColor,
} from "../constants"
import type { Entry } from "../types"
import { TAU } from "../utils"
import { layoutLabels, wheelFont } from "./wheel-labels"
import type { LabelCache } from "./wheel-labels"

function drawEmptyWheel(
  ctx: CanvasRenderingContext2D,
  center: number,
  radius: number
) {
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, TAU)
  ctx.fillStyle = EMPTY_WHEEL_COLOR
  ctx.fill()

  const fontSize = radius * 0.085
  ctx.font = wheelFont(fontSize)
  ctx.fillStyle = LABEL_COLOR
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("Add some entries", center, center - radius * 0.5)
  ctx.fillText("to spin the wheel", center, center - radius * 0.5 + fontSize * 1.4)
}

/**
 * Static wavy rim. Only the outer edge is wavy (a sine wave whose crests reach
 * `peak`); the inner edge is the slices' circle, which is drawn over this shape.
 */
function drawBorder(
  ctx: CanvasRenderingContext2D,
  center: number,
  peak: number
) {
  const amplitude = peak * BORDER_AMPLITUDE
  const mid = peak - amplitude
  const points = BORDER_WAVES * 16 // enough samples to look perfectly smooth
  ctx.beginPath()
  for (let k = 0; k < points; k++) {
    const angle = (k / points) * TAU
    const r = mid + amplitude * Math.cos(angle * BORDER_WAVES)
    const x = center + Math.cos(angle) * r
    const y = center + Math.sin(angle) * r
    if (k === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
  ctx.fillStyle = BORDER_FILL
  ctx.fill()
}

function drawSlices(
  ctx: CanvasRenderingContext2D,
  center: number,
  radius: number,
  entries: Entry[],
  rotation: number,
  cache: LabelCache
) {
  const count = entries.length
  const step = TAU / count

  for (let i = 0; i < count; i++) {
    const start = rotation + i * step
    ctx.beginPath()
    ctx.moveTo(center, center)
    ctx.arc(center, center, radius, start, start + step)
    ctx.closePath()
    ctx.fillStyle = getSliceColor(i, count)
    ctx.fill()
    if (count > 1) {
      ctx.lineWidth = 2
      ctx.strokeStyle = SEPARATOR_COLOR
      ctx.stroke()
    }
  }

  const key = `${radius}|${entries.map((entry) => entry.label).join("\n")}`
  if (!cache.current || cache.current.key !== key) {
    cache.current = layoutLabels(ctx, entries, radius, key)
  }
  const { fontSize, labels } = cache.current
  if (fontSize < 6) return // slices too thin to read; the colours still work

  ctx.font = wheelFont(fontSize)
  ctx.fillStyle = LABEL_COLOR
  ctx.textAlign = "right"
  ctx.textBaseline = "middle"
  for (let i = 0; i < count; i++) {
    ctx.save()
    ctx.translate(center, center)
    ctx.rotate(rotation + (i + 0.5) * step)
    ctx.fillText(labels[i] ?? "", radius * 0.93, 0)
    ctx.restore()
  }
}

/** Draws the whole wheel (rim, slices and labels) into a square of `size` px. */
export function drawWheel(
  ctx: CanvasRenderingContext2D,
  size: number,
  entries: Entry[],
  rotation: number,
  cache: LabelCache
) {
  const center = size / 2
  const peak = center - WHEEL_EDGE_MARGIN // small margin so the crests aren't clipped
  const radius = peak * (1 - BORDER_BAND)

  drawBorder(ctx, center, peak)

  if (entries.length === 0) {
    drawEmptyWheel(ctx, center, radius)
  } else {
    drawSlices(ctx, center, radius, entries, rotation, cache)
  }

  // Thin light ring where the slices meet the border.
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, TAU)
  ctx.lineWidth = 3
  ctx.strokeStyle = SEPARATOR_COLOR
  ctx.stroke()
}
