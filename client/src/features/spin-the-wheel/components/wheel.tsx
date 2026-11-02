import { useCallback, useEffect, useRef, useState } from "react"
import {
  BORDER_AMPLITUDE,
  BORDER_BAND,
  BORDER_FILL,
  BORDER_WAVES,
  EMPTY_WHEEL_COLOR,
  LABEL_COLOR,
  SEPARATOR_COLOR,
  WHEEL_FONT_FAMILY,
  getSliceColor,
} from "../constants"
import type { Entry, SpinResult } from "../types"
import { TAU, easeOutQuart, indexAtPointer, mod, planSpin } from "../utils"

interface WheelProps {
  entries: Entry[]
  onSpinStart?: () => void
  onSpinEnd?: (result: SpinResult) => void
}

interface LabelLayout {
  key: string
  fontSize: number
  labels: string[]
}

type LabelCache = { current: LabelLayout | null }

const wheelFont = (px: number) => `700 ${px}px ${WHEEL_FONT_FAMILY}`

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

function layoutLabels(
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

function drawWheel(
  ctx: CanvasRenderingContext2D,
  size: number,
  entries: Entry[],
  rotation: number,
  cache: LabelCache
) {
  const center = size / 2
  const peak = center - 2 // small margin so the crests aren't clipped
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

export function Wheel({ entries, onSpinStart, onSpinEnd }: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef<HTMLDivElement>(null)
  const entriesRef = useRef(entries)
  const callbacksRef = useRef({ onSpinStart, onSpinEnd })
  const rotationRef = useRef(0)
  const sizeRef = useRef(0)
  const frameRef = useRef(0)
  const spinningRef = useRef(false)
  const labelCacheRef = useRef<LabelLayout | null>(null)
  const [spinning, setSpinning] = useState(false)

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const size = sizeRef.current
    if (!canvas || !ctx || size === 0) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    drawWheel(ctx, size, entriesRef.current, rotationRef.current, labelCacheRef)
  }, [])

  // The pointer gets knocked back each time a slice edge passes under it.
  const flick = useCallback(() => {
    pointerRef.current?.animate(
      [{ transform: "rotate(-22deg)" }, { transform: "rotate(0deg)" }],
      { duration: 140, easing: "ease-out" }
    )
  }, [])

  const spin = useCallback(() => {
    const list = entriesRef.current
    if (spinningRef.current || list.length === 0) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = rotationRef.current
    const { winnerIndex, total, duration } = planSpin(
      start,
      list.length,
      Math.random,
      reduced
    )

    spinningRef.current = true
    setSpinning(true)
    callbacksRef.current.onSpinStart?.()

    const startedAt = performance.now()
    let lastIndex = indexAtPointer(start, list.length)
    let lastTick = 0

    const frame = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration)
      rotationRef.current = start + total * easeOutQuart(t)
      paint()

      const index = indexAtPointer(rotationRef.current, list.length)
      if (index !== lastIndex) {
        lastIndex = index
        if (now - lastTick > 40) {
          lastTick = now
          flick()
        }
      }

      if (t < 1) {
        frameRef.current = requestAnimationFrame(frame)
        return
      }

      rotationRef.current = mod(rotationRef.current, TAU)
      spinningRef.current = false
      setSpinning(false)
      const entry = list[winnerIndex]
      if (entry) {
        callbacksRef.current.onSpinEnd?.({
          entry,
          index: winnerIndex,
          color: getSliceColor(winnerIndex, list.length),
        })
      }
    }

    frameRef.current = requestAnimationFrame(frame)
  }, [paint, flick])

  useEffect(() => {
    callbacksRef.current = { onSpinStart, onSpinEnd }
  }, [onSpinStart, onSpinEnd])

  useEffect(() => {
    entriesRef.current = entries
    paint()
  }, [entries, paint])

  // Keep the canvas bitmap matched to its CSS size and the device pixel ratio.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver((observed) => {
      const box = observed[0]
      if (!box) return
      const size = Math.floor(box.contentRect.width)
      const dpr = window.devicePixelRatio || 1
      sizeRef.current = size
      canvas.width = Math.round(size * dpr)
      canvas.height = Math.round(size * dpr)
      labelCacheRef.current = null
      paint()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [paint])

  // Labels are measured with the web font, so repaint once it has loaded.
  useEffect(() => {
    let cancelled = false
    document.fonts
      ?.load(wheelFont(16))
      .then(() => {
        if (cancelled) return
        labelCacheRef.current = null
        paint()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [paint])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const canSpin = entries.length > 0 && !spinning

  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <canvas
        ref={canvasRef}
        onClick={spin}
        role="img"
        aria-label={`Wheel with ${entries.length} ${
          entries.length === 1 ? "entry" : "entries"
        }`}
        className={`block aspect-square w-full drop-shadow-lg ${
          canSpin ? "cursor-pointer" : ""
        }`}
      />

      {/* Pointer: sits at 3 o'clock and points at the winning slice. */}
      <div className="pointer-events-none absolute top-1/2 right-0 z-10 w-[7.5%] min-w-7 -translate-y-1/2">
        <div ref={pointerRef} className="origin-right drop-shadow-md">
          <svg
            viewBox="0 0 44 36"
            className="block w-full fill-primary stroke-card"
            strokeWidth={3}
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 18 L35 3 Q41 1 41 8 L41 28 Q41 35 35 33 Z" />
          </svg>
        </div>
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={!canSpin}
        aria-label="Spin the wheel"
        className="absolute top-1/2 left-1/2 z-10 flex aspect-square w-[17%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-card bg-primary font-heading font-extrabold tracking-wide text-primary-foreground shadow-lg transition-transform hover:scale-103 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-97 disabled:opacity-60 disabled:hover:scale-100 text-base"
      >
        SPIN
      </button>
    </div>
  )
}
