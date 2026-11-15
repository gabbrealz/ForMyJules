import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import { cn } from "cn"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "#components/ui/button"
import { Spinner } from "#components/ui/spinner"

import { useBackgroundRemoval } from "../hooks/use-background-removal"
import type { CameraState } from "../hooks/use-camera"

type CameraPreviewProps = {
  camera: CameraState
  filter?: string
  videoRef?: RefObject<HTMLVideoElement | null>
  removeBackground?: boolean
  /**
   * Receives the element to take photos from: the cutout canvas while the
   * background is removed, otherwise the <video>. Both are unmirrored and
   * uncropped, and have the camera's resolution.
   */
  captureRef?: RefObject<HTMLVideoElement | HTMLCanvasElement | null>
  className?: string
  /** Overlays such as a countdown or a progress badge. */
  children?: ReactNode
}

// Shown behind the cutout so the transparent area is visible.
const CHECKERBOARD: CSSProperties = {
  backgroundColor: "#f4f4f5",
  backgroundImage:
    "conic-gradient(#d4d4d8 25%, transparent 0 50%, #d4d4d8 0 75%, transparent 0)",
  backgroundSize: "24px 24px",
}

// Mirrored like a selfie camera, cropped to 4:3 to match captured photos.
export function CameraPreview({
  camera,
  filter,
  videoRef,
  removeBackground = false,
  captureRef,
  className,
  children,
}: CameraPreviewProps) {
  const ownRef = useRef<HTMLVideoElement>(null)
  const ref = videoRef ?? ownRef
  const cutoutRef = useRef<HTMLCanvasElement>(null)
  const { stream, error, isStarting, retry } = camera

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [ref, stream, error])

  const removal = useBackgroundRemoval({
    enabled: removeBackground && !!stream && !error,
    videoRef: ref,
    canvasRef: cutoutRef,
  })
  const showCutout = removeBackground && removal.status === "ready"

  useEffect(() => {
    if (!captureRef) return
    captureRef.current = showCutout ? cutoutRef.current : ref.current
    return () => {
      captureRef.current = null
    }
  }, [captureRef, showCutout, ref, stream, error])

  return (
    <div
      style={showCutout ? CHECKERBOARD : undefined}
      className={cn(
        "relative aspect-4/3 w-full overflow-hidden rounded-xl border bg-black/90 shadow-lg",
        className,
      )}
    >
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-cream">
          <p className="text-sm font-medium">{error}</p>
          <Button type="button" variant="secondary" onClick={retry}>
            <RefreshCwIcon /> Try again
          </Button>
        </div>
      ) : (
        <>
          {/*
            The video stays mounted and playing, because it is the source of
            every frame. It is only made see-through (not hidden) while the
            cutout covers it: browsers may stop updating a hidden video.
          */}
          <video
            ref={ref}
            autoPlay
            playsInline
            muted
            style={{ filter }}
            className={cn(
              "size-full -scale-x-100 object-cover",
              showCutout && "opacity-0",
            )}
          />
          {removeBackground && (
            <canvas
              ref={cutoutRef}
              aria-hidden
              style={{ filter }}
              className={cn(
                "absolute inset-0 size-full -scale-x-100 object-cover",
                !showCutout && "opacity-0",
              )}
            />
          )}
          {isStarting && (
            <div className="absolute inset-0 grid place-items-center text-cream">
              <Spinner className="size-6" />
            </div>
          )}
          {removeBackground && removal.status === "loading" && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-cream">
              <Spinner className="size-3.5" /> Preparing background removal…
            </div>
          )}
          {removeBackground && removal.status === "error" && (
            <div
              role="alert"
              title={removal.error ?? undefined}
              className="absolute right-3 bottom-3 left-3 rounded-md bg-black/70 px-3 py-2 text-xs text-cream"
            >
              Background removal isn't available right now, so you're seeing
              the normal camera.
            </div>
          )}
        </>
      )}
      {children}
    </div>
  )
}
