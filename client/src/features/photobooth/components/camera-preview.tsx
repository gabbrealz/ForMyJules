import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import { cn } from "cn"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "#components/ui/button"
import { Spinner } from "#components/ui/spinner"

import type { CameraState } from "../hooks/use-camera"

type CameraPreviewProps = {
  camera: CameraState
  /** CSS `filter` value applied to the live feed. */
  filter?: string
  /** Lets a parent read the <video> element (e.g. to capture a frame). */
  videoRef?: RefObject<HTMLVideoElement | null>
  className?: string
  /** Overlays such as a countdown or a progress badge. */
  children?: ReactNode
}

// Mirrored like a selfie camera, cropped to 4:3 to match captured photos.
export function CameraPreview({
  camera,
  filter,
  videoRef,
  className,
  children,
}: CameraPreviewProps) {
  const ownRef = useRef<HTMLVideoElement>(null)
  const ref = videoRef ?? ownRef
  const { stream, error, isStarting, retry } = camera

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [ref, stream, error])

  return (
    <div
      className={cn(
        "relative aspect-4/3 w-full overflow-hidden rounded-xl border bg-black/90 shadow-lg",
        className
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
          <video
            ref={ref}
            autoPlay
            playsInline
            muted
            style={{ filter }}
            className="size-full -scale-x-100 object-cover"
          />
          {isStarting && (
            <div className="absolute inset-0 grid place-items-center text-cream">
              <Spinner className="size-6" />
            </div>
          )}
        </>
      )}
      {children}
    </div>
  )
}
