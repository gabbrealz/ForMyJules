import { useCallback, useEffect, useRef } from "react"
import type { RefObject } from "react"
import { drawWheel } from "../services/wheel-renderer"
import { wheelFont } from "../services/wheel-labels"
import type { LabelLayout } from "../services/wheel-labels"
import type { Entry } from "../types"

/**
 * Owns the wheel's canvas: keeps its bitmap matched to its CSS size and the
 * device pixel ratio, and repaints it when the entries change, the web font
 * loads, or `paint()` is called (e.g. every animation frame while turning).
 * The current angle is read from `rotationRef`.
 */
export function useWheelCanvas(
  entries: Entry[],
  rotationRef: RefObject<number>
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const entriesRef = useRef(entries)
  const sizeRef = useRef(0)
  const labelCacheRef = useRef<LabelLayout | null>(null)

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const size = sizeRef.current
    if (!canvas || !ctx || size === 0) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    drawWheel(ctx, size, entriesRef.current, rotationRef.current, labelCacheRef)
  }, [rotationRef])

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

  return { canvasRef, paint }
}
