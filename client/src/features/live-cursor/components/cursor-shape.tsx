import type { CursorShape } from "../types.ts"

function ShapePath({ shape }: { shape: CursorShape }) {
  switch (shape) {
    // Tip at the origin, like an arrow pointer.
    case "triangle":
      return <path d="M0 0 L0 16 L11 11 Z" />
    // The others are centred on the origin.
    case "diamond":
      return <path d="M0 -8 L8 0 L0 8 L-8 0 Z" />
    case "circle":
      return <circle r="7" />
    case "square":
      return <rect x="-6.5" y="-6.5" width="13" height="13" rx="2" />
  }
}

/** Drawn around the cursor's position: (0, 0) of the viewBox is the exact spot being pointed at. */
export function CursorShapeIcon({
  shape,
  color,
}: {
  shape: CursorShape
  color: string
}) {
  return (
    <svg
      viewBox="-12 -12 24 24"
      className="absolute -top-3 -left-3 size-6 overflow-visible drop-shadow-md"
      aria-hidden
    >
      <g fill={color} stroke="white" strokeWidth={1.5} strokeLinejoin="round">
        <ShapePath shape={shape} />
      </g>
    </svg>
  )
}
