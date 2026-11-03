import { useRef, type Ref } from "react"
import { useIdleDrift } from "../hooks/use-idle-drift"
import { useNeedleFlick } from "../hooks/use-needle-flick"
import { useWheelCanvas } from "../hooks/use-wheel-canvas"
import { useWheelSpin } from "../hooks/use-wheel-spin"
import type { Entry, SpinResult } from "../types"

import { BORDER_BAND, WHEEL_EDGE_MARGIN } from "../constants"

interface SpinButtonProps {
  spinning: boolean
  disabled: boolean
  onClick: () => void
}

/**
 * Centre button. While spinning it shrinks into a small hub and the label
 * fades out; it springs back when the wheel stops. The font size steps up with
 * the wheel's width (container-query variants of the wheel's `@container`).
 */
export function SpinButton({ spinning, disabled, onClick }: SpinButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spin the wheel"
      className={`
        absolute top-1/2 left-1/2 z-10 flex aspect-square w-[17%] -translate-x-1/2 -translate-y-1/2 items-center justify-center
        rounded-full border-4 border-card bg-primary font-heading font-extrabold
        text-base @sm:text-lg @md:text-xl @lg:text-2xl tracking-wide text-primary-foreground shadow-lg
        focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none
        transition-transform duration-500 motion-reduce:transition-none ${
        spinning
          ? "pointer-events-none scale-30 ease-in-out"
          : "ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-103 active:scale-97 disabled:opacity-60 disabled:hover:scale-100"
      }`}
    >
      <span
        className={`transition-opacity motion-reduce:transition-none ${
          spinning ? "opacity-0 duration-150" : "opacity-100 delay-200 duration-300"
        }`}
      >
        SPIN
      </span>
    </button>
  )
}

/**
 * Distance from the canvas edge to the edge of the choices (where the slices
 * end), derived from the same values the renderer uses so the needle stays
 * glued to it at any wheel size.
 */
const CHOICES_EDGE = `calc(${BORDER_BAND * 50}% + ${WHEEL_EDGE_MARGIN * (1 - BORDER_BAND)}px)`

interface WheelNeedleProps {
  /** The element that swings when the needle is flicked. */
  ref?: Ref<HTMLDivElement>
}

/**
 * Needle: its centre sits exactly on the edge of the choices, so it straddles
 * the rim. `translate-x-1/2` shifts it by half its own width, which keeps the
 * centre on that edge whatever the width is.
 */
export function WheelNeedle({ ref }: WheelNeedleProps) {
  return (
    <div
      className="pointer-events-none absolute top-1/2 z-10 w-[12%] min-w-7 translate-x-1/2 -translate-y-1/2"
      style={{ right: CHOICES_EDGE }}
    >
      <div ref={ref} className="origin-center drop-shadow-md">
        <svg viewBox="0 0 48 26" className="block w-full" aria-hidden>
          {/* Two halves split lengthwise: muted on top, theme primary below. */}
          <path d="M3 13 L24 3 L45 13 Z" className="fill-muted-foreground" />
          <path d="M3 13 L45 13 L24 23 Z" className="fill-primary" />
          <path
            d="M3 13 L24 3 L45 13 L24 23 Z"
            className="fill-none stroke-card"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

interface WheelProps {
  entries: Entry[]
  /** Stops the idle drift, e.g. while the winner is on screen. */
  paused?: boolean
  onSpinStart?: () => void
  onSpinEnd?: (result: SpinResult) => void
}

export function Wheel({
  entries,
  paused = false,
  onSpinStart,
  onSpinEnd,
}: WheelProps) {
  // Current angle of the wheel, shared by drawing, spinning and idle drift.
  const rotationRef = useRef(0)

  const { canvasRef, paint } = useWheelCanvas(entries, rotationRef)
  const { needleRef, flick } = useNeedleFlick()
  const { spinning, spin } = useWheelSpin({
    entries,
    rotationRef,
    paint,
    onSpinStart,
    onSpinEnd,
    onTick: flick,
  })
  useIdleDrift({
    enabled: entries.length > 0 && !spinning && !paused,
    rotationRef,
    paint,
  })

  const canSpin = entries.length > 0 && !spinning

  return (
    <div className="@container relative mx-auto w-full max-w-[640px]">
      <canvas
        ref={canvasRef}
        onClick={spin}
        role="img"
        aria-label={`Wheel with ${entries.length} ${
          entries.length === 1 ? "entry" : "entries"
        }`}
        className={`block aspect-square w-full rounded-full drop-shadow-lg ${
          canSpin ? "cursor-pointer" : ""
        }`}
      />
      <WheelNeedle ref={needleRef} />
      <SpinButton spinning={spinning} disabled={!canSpin} onClick={spin} />
    </div>
  )
}
