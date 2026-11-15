import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "cn"
import {
  CameraIcon,
  CheckIcon,
  RefreshCwIcon,
  SquareIcon,
  XIcon,
} from "lucide-react"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "#components/ui/dialog"

import { PHOTO_ASPECT, getFilter } from "../constants"
import type { CameraState } from "../hooks/use-camera"
import type { Experience, PhotoLayout } from "../types"
import { CameraPreview } from "./camera-preview"
import { STEP_BUTTON_CLASS, StepActions } from "./step-actions"

/** The camera modal's buttons: bigger than the step buttons, same text and icon size. */
const CAMERA_BUTTON_CLASS = "h-14 min-w-44 px-10 has-[>svg]:px-10"

type PhotoSlotsProps = {
  photos: string[]
  shots: number
  /**
   * "row": a strip of small thumbnails under the camera (narrow screens).
   * "column": a panel beside the camera, sized from the camera's width (xl+).
   */
  variant: "row" | "column"
}

/** The photos taken so far, with the next empty slot outlined. */
function PhotoSlots({ photos, shots, variant }: PhotoSlotsProps) {
  const isColumn = variant === "column"
  const taken = photos.length
  const columns = shots > 4 ? 2 : 1

  return (
    <ol
      className={cn(
        isColumn
          ? // Absolutely placed against the camera's right edge, so the camera
            // stays centred and the panel is exactly as tall as the camera.
            "absolute top-0 left-full ml-6 hidden h-full content-center gap-2 xl:grid"
          : "flex shrink-0 flex-wrap justify-center gap-2 xl:hidden",
      )}
      style={
        isColumn
          ? {
              // Each cell is a quarter of the camera's width (less a gap), so
              // four rows of 4:3 cells are exactly as tall as the camera.
              width: `calc(${columns} * (25% - 0.5rem) + ${columns - 1} * 0.5rem)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }
          : undefined
      }
    >
      {Array.from({ length: shots }, (_, index) => {
        const photo = photos[index]
        return (
          <li
            key={index}
            className={cn(
              "relative aspect-4/3 overflow-hidden rounded-md border",
              isColumn ? "w-full" : "h-14",
              photo
                ? "border-border/60 shadow-sm"
                : "border-dashed border-foreground/25 bg-background/50",
              index === taken && "ring-2 ring-primary",
            )}
          >
            {photo ? (
              <>
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="size-full object-cover"
                />
                {isColumn && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 text-[10px] leading-4 font-medium text-white">
                    {index + 1}
                  </span>
                )}
              </>
            ) : (
              <span
                className={cn(
                  "grid size-full place-items-center text-muted-foreground",
                  isColumn ? "text-sm" : "text-xs",
                )}
              >
                {index + 1}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

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
  // The camera preview in the modal fills this with what photos are taken from:
  // the background-removed canvas when that's on, otherwise the <video>.
  const captureRef = useRef<HTMLVideoElement | HTMLCanvasElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [countdown, setCountdown] = useState(experience.intervalSeconds)
  // 0 means no flash. Each capture bumps it, which mounts a fresh flash element.
  const [flashId, setFlashId] = useState(0)

  const filter = getFilter(experience.filterId).css
  const taken = photos.length
  const isComplete = taken >= layout.shots
  // The countdown only runs while the modal is open.
  const isCounting = isOpen && isRunning && !isComplete

  // Crops the centre of the feed to 4:3 and mirrors it, matching the preview.
  const capture = useCallback((): boolean => {
    const source = captureRef.current
    if (!source) return false

    // A video and a canvas report their size differently.
    const isVideo = source instanceof HTMLVideoElement
    const videoWidth = isVideo ? source.videoWidth : source.width
    const videoHeight = isVideo ? source.videoHeight : source.height
    if (!videoWidth || !videoHeight) return false

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
    // With the background removed the source is transparent outside the person,
    // and the PNG keeps that.
    context.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)

    onCapture(canvas.toDataURL("image/png"))
    setFlashId((id) => id + 1) // the only place a flash is triggered
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
      if (!capture()) {
        setIsRunning(false)
        return
      }
      // After the last photo, stop for good so nothing resumes by itself.
      if (taken + 1 >= layout.shots) setIsRunning(false)
      else setCountdown(experience.intervalSeconds)
    }, 1000)

    return () => window.clearTimeout(id)
  }, [
    isCounting,
    countdown,
    taken,
    capture,
    layout.shots,
    experience.intervalSeconds,
  ])

  // Closing the modal for any reason (X, Escape, Done) stops the session. The
  // modal never closes by itself, not even after the last photo.
  const closeModal = useCallback(() => {
    setIsOpen(false)
    setIsRunning(false)
    setFlashId(0)
  }, [])

  const openModal = () => {
    setCountdown(experience.intervalSeconds)
    setIsRunning(false)
    setIsOpen(true)
  }

  const start = () => {
    setCountdown(experience.intervalSeconds)
    setIsRunning(true)
  }

  const reset = () => {
    setIsRunning(false)
    setCountdown(experience.intervalSeconds)
    setFlashId(0)
    onReset()
  }

  const renderRetake = (className: string) =>
    taken > 0 &&
    !isCounting && (
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={reset}
      >
        <RefreshCwIcon /> Retake all
      </Button>
    )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Take your photos</CardTitle>
          <CardDescription>
            {layout.shots === 1
              ? "One photo, one countdown."
              : `${layout.shots} photos, one every ${experience.intervalSeconds} seconds.`}{" "}
            Click <b>Open Camera</b> to start
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-y-4">
          {camera.error && (
            <div
              role="alert"
              className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
            >
              <p>{camera.error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={camera.retry}
              >
                <RefreshCwIcon /> Try again
              </Button>
            </div>
          )}

          <div className="mx-auto flex max-w-2xl items-center justify-center gap-3">
            {!isComplete && (
              <Button
                type="button"
                className={cn(STEP_BUTTON_CLASS, "h-12")}
                onClick={openModal}
                disabled={!camera.stream}
              >
                <CameraIcon /> {taken === 0 ? "Open Camera" : "Continue"}
              </Button>
            )}
            {renderRetake(cn(STEP_BUTTON_CLASS, "h-12"))}
          </div>

          <ol
            className="mx-auto w-full grid place-items-center max-w-2xl gap-2"
            style={{
              gridTemplateColumns: `repeat(${layout.shots === 6 ? 3 : Math.min(layout.shots, 4)}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: layout.shots }, (_, index) => (
              <li
                key={index}
                className="aspect-4/3 w-full max-w-md overflow-hidden rounded-lg border bg-muted"
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

      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? setIsOpen(true) : closeModal())}
      >
        {/* The built-in close button is replaced by a larger one below. */}
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-svh w-svw max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background/40 p-0 backdrop-blur-sm sm:max-w-none"
        >
          <DialogTitle className="sr-only">Take your photos</DialogTitle>
          <DialogDescription className="sr-only">
            Camera view. Start the countdown to take your photos.
          </DialogDescription>

          <div className="flex shrink-0 justify-end p-4 pb-0">
            <Button
              type="button"
              variant="ghost"
              aria-label="Close camera"
              onClick={closeModal}
              className="size-11"
            >
              <XIcon className="size-6" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-center xl:[container-type:size]">
            <div className="relative grid min-h-0 w-full flex-1 place-items-center max-xl:[container-type:size] xl:block xl:w-[min(calc(100cqw_-_2*(100cqh*2/3_+_1rem)),calc(100cqh*4/3))] xl:flex-none">
              <CameraPreview
                camera={camera}
                filter={filter}
                captureRef={captureRef}
                removeBackground={experience.removeBackground}
                className="w-[min(100cqw,calc(100cqh*4/3))] xl:w-full"
              >
                <Badge variant="secondary" className="absolute top-3 left-3">
                  Photo {Math.min(taken + 1, layout.shots)} of {layout.shots}
                </Badge>

                {isCounting && (
                  <div
                    key={`countdown-${countdown}`}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 grid place-items-center animate-in fade-in zoom-in-50 duration-300"
                  >
                    <span className="font-heading text-8xl font-bold text-cream drop-shadow-lg">
                      {countdown}
                    </span>
                  </div>
                )}

                {/* Shutter flash: mounted by a capture, removed when it finishes. */}
                {flashId > 0 && (
                  <div
                    key={`flash-${flashId}`}
                    aria-hidden
                    onAnimationEnd={() => setFlashId(0)}
                    className="pointer-events-none absolute inset-0 bg-white animate-out fade-out duration-500 fill-mode-forwards motion-reduce:hidden"
                  />
                )}

                <span className="sr-only" aria-live="assertive">
                  {isCounting ? countdown : ""}
                </span>
              </CameraPreview>

              <PhotoSlots
                variant="column"
                photos={photos}
                shots={layout.shots}
              />
            </div>

            <PhotoSlots variant="row" photos={photos} shots={layout.shots} />
          </div>

          <div className="flex shrink-0 items-center justify-center gap-3 p-4 pb-6">
            {isCounting ? (
              <Button
                type="button"
                variant="outline"
                className={CAMERA_BUTTON_CLASS}
                onClick={() => setIsRunning(false)}
              >
                <SquareIcon /> Stop
              </Button>
            ) : isComplete ? (
              <Button
                type="button"
                className={CAMERA_BUTTON_CLASS}
                onClick={closeModal}
              >
                <CheckIcon /> Done
              </Button>
            ) : (
              <Button
                type="button"
                className={CAMERA_BUTTON_CLASS}
                onClick={start}
                disabled={!camera.stream}
              >
                <CameraIcon /> {taken === 0 ? "Start" : "Continue"}
              </Button>
            )}
            {renderRetake(CAMERA_BUTTON_CLASS)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
