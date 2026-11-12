import { cn } from "cn"

import { getFrameMetrics } from "../render-frame"
import type { PhotoLayout } from "../types"

type FramePreviewProps = {
  layout: PhotoLayout
  /** Frame colour. */
  color?: string
  /** Rendered height in px; the width follows the frame's proportions. */
  height?: number
  className?: string
}

/**
 * A miniature of the finished frame for a layout. Built from divs rather than
 * an <svg> so a parent Button's `[&_svg]` size rules can't shrink it.
 */
export function FramePreview({
  layout,
  color = "#ffffff",
  height = 96,
  className,
}: FramePreviewProps) {
  const frame = getFrameMetrics(layout)
  const width = Math.round((height * frame.width) / frame.height)

  return (
    <div
      aria-hidden
      className={cn("relative shrink-0 shadow-sm ring-1 ring-black/10", className)}
      style={{ width, height, backgroundColor: color }}
    >
      {frame.cells.map((cell, index) => (
        <div
          key={index}
          className="absolute bg-neutral-300"
          style={{
            left: `${(cell.x / frame.width) * 100}%`,
            top: `${(cell.y / frame.height) * 100}%`,
            width: `${(cell.width / frame.width) * 100}%`,
            height: `${(cell.height / frame.height) * 100}%`,
          }}
        />
      ))}
    </div>
  )
}
