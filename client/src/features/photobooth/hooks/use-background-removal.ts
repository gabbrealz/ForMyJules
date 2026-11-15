import { useEffect, useState, type RefObject } from "react"

import { CutoutRenderer } from "../background/cutout-renderer"
import {
  INVERT_MASK,
  SEGMENT_INPUT_WIDTH,
  loadSegmenter,
  nextTimestamp,
  pickPersonMask,
} from "../background/segmenter"

export type BackgroundRemovalStatus =
  /** Not enabled. */
  | "off"
  /** Loading the model, or waiting for the first mask. */
  | "loading"
  /** The canvas shows the cutout. */
  | "ready"
  | "error"

type UseBackgroundRemovalOptions = {
  enabled: boolean
  /** The playing camera video (the source of every frame). */
  videoRef: RefObject<HTMLVideoElement | null>
  /** The canvas the cutout is drawn on. It becomes a WebGL canvas. */
  canvasRef: RefObject<HTMLCanvasElement | null>
}

/**
 * Live background removal. Every new camera frame is:
 * 1. copied (small) to a scratch canvas and segmented by MediaPipe, which gives
 *    a low-resolution person mask;
 * 2. drawn full-size by a WebGL shader that applies that mask as transparency.
 * Step 2 is where the per-pixel work happens, and it's on the GPU.
 */
export function useBackgroundRemoval({
  enabled,
  videoRef,
  canvasRef,
}: UseBackgroundRemovalOptions) {
  const [status, setStatus] = useState<BackgroundRemovalStatus>("off")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStatus("off")
      setError(null)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let cancelled = false
    let frameHandle = 0
    let renderer: CutoutRenderer | null = null
    const hasVideoFrames = typeof video.requestVideoFrameCallback === "function"

    setStatus("loading")
    setError(null)

    const fail = (err: unknown) => {
      if (cancelled) return
      console.error("Background removal failed:", err)
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setStatus("error")
    }

    const run = async () => {
      try {
        renderer = new CutoutRenderer(canvas, { invert: INVERT_MASK })
        const { segmenter, labels } = await loadSegmenter()
        if (cancelled) return

        // Scratch copy of the frame for the model. Small on purpose.
        const input = document.createElement("canvas")
        const inputContext = input.getContext("2d")
        if (!inputContext) throw new Error("2D canvas isn't available.")

        let isReady = false

        const processFrame = () => {
          const current = renderer
          if (!current || video.readyState < 2 || !video.videoWidth) return
          if (current.isLost) throw new Error("The graphics context was lost.")

          const width = SEGMENT_INPUT_WIDTH
          const height = Math.max(
            1,
            Math.round((width * video.videoHeight) / video.videoWidth),
          )
          if (input.width !== width || input.height !== height) {
            input.width = width
            input.height = height
          }
          inputContext.drawImage(video, 0, 0, width, height)

          // The callback runs synchronously, and the mask is only valid inside it.
          segmenter.segmentForVideo(input, nextTimestamp(), (result) => {
            const mask = pickPersonMask(result, labels)
            if (mask) {
              current.setMask(mask.getAsFloat32Array(), mask.width, mask.height)
            }
          })

          current.render(video)

          // Switch the preview over once there is a real cutout to show.
          if (!isReady && current.hasMask) {
            isReady = true
            setStatus("ready")
          }
        }

        const onFrame = () => {
          if (cancelled) return
          try {
            processFrame()
          } catch (err) {
            fail(err)
            return // stop the loop
          }
          schedule()
        }

        // Only work when the camera produced a new frame.
        const schedule = () => {
          if (cancelled) return
          frameHandle = hasVideoFrames
            ? video.requestVideoFrameCallback(onFrame)
            : requestAnimationFrame(onFrame)
        }

        schedule()
      } catch (err) {
        fail(err)
      }
    }

    void run()

    return () => {
      cancelled = true
      if (hasVideoFrames) video.cancelVideoFrameCallback(frameHandle)
      else cancelAnimationFrame(frameHandle)
      renderer?.dispose()
      renderer = null
    }
  }, [enabled, videoRef, canvasRef])

  return { status, error }
}
