import { useCallback, useEffect, useRef, useState } from "react"
import { CameraIcon, RefreshCwIcon, SquareIcon } from "lucide-react"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { PHOTO_ASPECT, getFilter } from "../constants"
import type { CameraState } from "../hooks/use-camera"
import type { Experience, PhotoLayout } from "../types"
import { CameraPreview } from "./camera-preview"
import { StepActions } from "./step-actions"

type TakePhotosStepProps = {
  layout: PhotoLayout
  experience: Experience
  camera: CameraState
  photos: string[]
  /** Must be stable (it's an effect dependency) and append to `photos`. */
  onCapture: (dataUrl: string) => void
  onReset: () => void
  onBack: () => void
  onNext: () => void
}

export function TakePhotosStep({
  layout,
  experience,
  camera,
  photos,
  onCapture,
  onReset,
  onBack,
  onNext,
}: TakePhotosStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [countdown, setCountdown] = useState(experience.intervalSeconds)

  const filter = getFilter(experience.filterId).css
  const taken = photos.length
  const isComplete = taken >= layout.shots
  const isCounting = isRunning && !isComplete

  // Crops the centre of the feed to 4:3 and mirrors it, matching the preview.
  const capture = useCallback((): boolean => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return false

    const { videoWidth, videoHeight } = video
    let sw = videoWidth
    let sh = videoHeight
    if (videoWidth / videoHeight > PHOTO_ASPECT) sw = videoHeight * PHOTO_ASPECT
    else sh = videoWidth / PHOTO_ASPECT
    const sx = (videoWidth - sw) / 2
    const sy = (videoHeight - sh) / 2

    const canvas = document.createElement("canvas")
    canvas.width = sw
    canvas.height = sh
    const context = canvas.getContext("2d")
    if (!context) return false

    context.filter = filter
    context.translate(sw, 0)
    context.scale(-1, 1)
    context.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)

    onCapture(canvas.toDataURL("image/png"))
    return true
  }, [filter, onCapture])

  // One tick per second; the photo is taken when the countdown reaches zero.
  // `taken` is a dependency so the timer re-arms after each capture.
  useEffect(() => {
    if (!isCounting) return

    const id = window.setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1)
        return
      }
      if (capture()) setCountdown(experience.intervalSeconds)
      else setIsRunning(false)
    }, 1000)

    return () => window.clearTimeout(id)
  }, [isCounting, countdown, taken, capture, experience.intervalSeconds])

  const start = () => {
    setCountdown(experience.intervalSeconds)
    setIsRunning(true)
  }

  const reset = () => {
    setIsRunning(false)
    setCountdown(experience.intervalSeconds)
    onReset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Take your photos</CardTitle>
        <CardDescription>
          {layout.shots === 1
            ? "One photo, one countdown."
            : `${layout.shots} photos, one every ${experience.intervalSeconds} seconds.`}{" "}
          Press start when you're ready.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <CameraPreview
          camera={camera}
          filter={filter}
          videoRef={videoRef}
          className="mx-auto max-w-2xl"
        >
          <Badge variant="secondary" className="absolute top-3 left-3">
            Photo {Math.min(taken + 1, layout.shots)} of {layout.shots}
          </Badge>

          {isCounting && (
            <div
              key={countdown}
              aria-live="assertive"
              className="pointer-events-none absolute inset-0 grid place-items-center animate-in fade-in zoom-in-50 duration-300"
            >
              <span className="font-heading text-8xl font-bold text-cream drop-shadow-lg">
                {countdown}
              </span>
            </div>
          )}

          {/* Shutter flash; replays on every capture via the key. */}
          {isRunning && taken > 0 && (
            <div
              key={taken}
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-white animate-out fade-out duration-500 fill-mode-forwards motion-reduce:hidden"
            />
          )}
        </CameraPreview>

        <div className="mx-auto flex max-w-2xl items-center justify-center gap-3">
          {isCounting ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRunning(false)}
            >
              <SquareIcon /> Stop
            </Button>
          ) : (
            !isComplete && (
              <Button type="button" onClick={start} disabled={!camera.stream}>
                <CameraIcon /> {taken === 0 ? "Start" : "Continue"}
              </Button>
            )
          )}
          {taken > 0 && !isCounting && (
            <Button type="button" variant="outline" onClick={reset}>
              <RefreshCwIcon /> Retake all
            </Button>
          )}
        </div>

        <ol
          className="mx-auto grid max-w-2xl gap-2"
          style={{
            gridTemplateColumns: `repeat(${layout.shots}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: layout.shots }, (_, index) => (
            <li
              key={index}
              className="aspect-4/3 overflow-hidden rounded-lg border bg-muted"
            >
              {photos[index] ? (
                <img
                  src={photos[index]}
                  alt={`Photo ${index + 1}`}
                  className="size-full object-cover"
                />
              ) : (
                <span className="grid size-full place-items-center text-sm text-muted-foreground">
                  {index + 1}
                </span>
              )}
            </li>
          ))}
        </ol>
      </CardContent>

      <CardFooter>
        <StepActions
          onBack={onBack}
          onNext={onNext}
          nextDisabled={!isComplete}
        />
      </CardFooter>
    </Card>
  )
}
