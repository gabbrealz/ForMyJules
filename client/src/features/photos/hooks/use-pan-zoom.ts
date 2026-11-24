import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent } from "react"

const MIN_SCALE = 1
const MAX_SCALE = 8
/** Each zoom button press multiplies (or divides) the scale by this. */
const ZOOM_STEP = 1.5

type View = { scale: number; x: number; y: number }
type Box = { w: number; h: number }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * How far the image may be dragged from the center on each axis. The image is
 * laid out with `object-contain`, so at 1x it fills the box on one axis and has
 * spare room on the other; it can only be dragged once it overflows the box.
 */
function panLimits(scale: number, imageW: number, imageH: number, box: Box) {
  if (!box.w || !box.h) return { x: 0, y: 0 }
  const fit = Math.min(box.w / imageW, box.h / imageH)
  return {
    x: Math.max(0, (imageW * fit * scale - box.w) / 2),
    y: Math.max(0, (imageH * fit * scale - box.h) / 2),
  }
}

function constrain(view: View, imageW: number, imageH: number, box: Box): View {
  const limits = panLimits(view.scale, imageW, imageH, box)
  return {
    scale: view.scale,
    x: clamp(view.x, -limits.x, limits.x),
    y: clamp(view.y, -limits.y, limits.y),
  }
}

/**
 * Button-driven zoom plus drag-to-pan for an image shown with `object-contain`
 * inside a viewport element. Attach `viewportRef` and `handlers` to the viewport
 * and apply `transform` to the element that wraps the image.
 * `imageW` and `imageH` are the photo's stored dimensions (only their ratio matters).
 */
export function usePanZoom(imageW: number, imageH: number) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box>({ w: 0, h: 0 })
  const [view, setView] = useState<View>({ scale: MIN_SCALE, x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const measure = () =>
      setBox({ w: element.clientWidth, h: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Resizing the window can leave the image panned out of range, so re-clamp on every render.
  const current = constrain(view, imageW, imageH, box)
  const limits = panLimits(current.scale, imageW, imageH, box)
  const canPan = limits.x > 0 || limits.y > 0

  const zoomBy = useCallback(
    (factor: number) => {
      setView((previous) => {
        const scale = clamp(
          Math.round(previous.scale * factor * 1000) / 1000,
          MIN_SCALE,
          MAX_SCALE,
        )
        return constrain({ ...previous, scale }, imageW, imageH, box)
      })
    },
    [imageW, imageH, box],
  )

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      // Primary button only for a mouse; touch and pen always report button 0.
      if (!canPan || event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: current.x,
        originY: current.y,
      }
      setDragging(true)
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      setView((previous) =>
        constrain(
          {
            scale: previous.scale,
            x: drag.originX + event.clientX - drag.startX,
            y: drag.originY + event.clientY - drag.startY,
          },
          imageW,
          imageH,
          box,
        ),
      )
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
  }

  return {
    viewportRef,
    handlers,
    /** CSS transform for the element wrapping the image. */
    transform: `translate(${current.x}px, ${current.y}px) scale(${current.scale})`,
    /** True while the pointer is dragging; skip transitions then so the image follows it. */
    dragging,
    /** True when the zoomed image overflows the viewport, so dragging does something. */
    canPan,
    canZoomIn: current.scale < MAX_SCALE,
    canZoomOut: current.scale > MIN_SCALE,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(1 / ZOOM_STEP),
  }
}

export type PanZoom = ReturnType<typeof usePanZoom>
