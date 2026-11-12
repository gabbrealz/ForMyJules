import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "cn"
import { CheckIcon, RefreshCwIcon, UploadIcon } from "lucide-react"

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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field"
import { Spinner } from "#components/ui/spinner"
import { canManagePhotos, useRequiredUser } from "#features/auth"
import { uploadPhoto } from "#features/photos"
import { HttpError } from "#services/http-client"

import { DEFAULT_FRAME_COLOR, FRAME_COLORS } from "../constants"
import { canvasToFile, loadPhotos, renderFrame } from "../render-frame"
import type { PhotoLayout } from "../types"
import { STEP_BUTTON_CLASS, StepActions } from "./step-actions"

type PickFrameStepProps = {
  layout: PhotoLayout
  /** Captured photos as data URLs, in layout order. */
  photos: string[]
  onBack: () => void
  /** Called after a successful save, when the person wants another round. */
  onStartOver: () => void
}

type UploadStatus = "idle" | "uploading" | "done" | "error"

function describeError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 403) return "Guests can't save photos to the gallery."
    if (error.code === "storage_full") {
      return "Gallery storage is almost full, so new photos can't be saved."
    }
    if (error.status === 429) {
      return "Too many uploads at once. Wait a moment and try again."
    }
    return error.message
  }
  return error instanceof Error
    ? error.message
    : "Upload failed. Please try again."
}

export function PickFrameStep({
  layout,
  photos,
  onBack,
  onStartOver,
}: PickFrameStepProps) {
  const navigate = useNavigate()
  const user = useRequiredUser()
  const canSave = canManagePhotos(user)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [color, setColor] = useState(DEFAULT_FRAME_COLOR)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const ready = images.length === layout.shots
  const isUploading = status === "uploading"
  const isDone = status === "done"
  const controlsLocked = isUploading || isDone

  // Decode the captured photos once; colour changes only redraw.
  useEffect(() => {
    let cancelled = false
    loadPhotos(photos)
      .then((loaded) => {
        if (!cancelled) setImages(loaded)
      })
      .catch((err) => {
        console.error("Error loading photos:", err)
        if (!cancelled) setError("Couldn't load your photos for the frame.")
      })
    return () => {
      cancelled = true
    }
  }, [photos])

  // The preview canvas is also what gets uploaded, so they can't drift apart.
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && images.length) renderFrame(canvas, layout, images, color)
  }, [images, layout, color])

  // Cancel an in-flight upload if the person leaves the step.
  useEffect(() => () => abortRef.current?.abort(), [])

  const save = async () => {
    const canvas = canvasRef.current
    if (!canvas || !ready || !canSave) return

    const controller = new AbortController()
    abortRef.current = controller
    setStatus("uploading")
    setError(null)

    try {
      const file = await canvasToFile(canvas, `photobooth-${Date.now()}.png`)
      // Signs, uploads full + thumb straight to Cloudinary, then saves the
      // metadata. `kind` is left out so the server defaults it to "photo"
      // (the API only knows photo, graphic and sticker).
      await uploadPhoto(file, { signal: controller.signal })
      setStatus("done")
    } catch (err) {
      if (controller.signal.aborted) return
      console.error("Error saving photobooth frame:", err)
      setError(describeError(err))
      setStatus("error")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Pick a frame</CardTitle>
        <CardDescription>
          {canSave
            ? "Choose a colour for your frame, then save it to the gallery."
            : "Choose a colour for your frame."}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="relative grid min-h-48 place-items-center rounded-xl border bg-muted/50 p-4">
          {!ready && !error && <Spinner className="size-6" />}
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Preview of your framed photos"
            className={cn(
              "h-auto max-h-[60svh] w-auto max-w-full shadow-lg",
              !ready && "hidden",
            )}
          />
        </div>

        <FieldGroup>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="frame-color">Frame colour</FieldLabel>
              <Badge variant="secondary" className="uppercase">
                {color}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map(({ name, value }) => (
                <button
                  key={value}
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={color.toLowerCase() === value}
                  disabled={controlsLocked}
                  onClick={() => setColor(value)}
                  style={{ backgroundColor: value }}
                  className={cn(
                    "size-9 rounded-full border-2 border-border transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-50",
                    color.toLowerCase() === value &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                />
              ))}
            </div>

            <input
              id="frame-color"
              type="color"
              value={color}
              disabled={controlsLocked}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <FieldDescription>
              Pick a preset, or choose any colour you like.
            </FieldDescription>
          </Field>

          {!canSave && (
            <FieldDescription>
              Guest accounts are view-only, so this frame can't be saved to the
              gallery.
            </FieldDescription>
          )}

          {error && <FieldError>{error}</FieldError>}
        </FieldGroup>
      </CardContent>

      <CardFooter>
        {isDone ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckIcon className="size-4" /> Saved to the gallery
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className={STEP_BUTTON_CLASS}
                onClick={onStartOver}
              >
                <RefreshCwIcon /> Take more photos
              </Button>
              <Button
                type="button"
                className={STEP_BUTTON_CLASS}
                onClick={() => navigate("/gallery")}
              >
                View gallery
              </Button>
            </div>
          </div>
        ) : (
          // Same component as the other steps, so Back and Save share one size.
          <StepActions
            onBack={onBack}
            backDisabled={isUploading}
            onNext={save}
            nextDisabled={!ready || !canSave || isUploading}
            nextLabel={
              isUploading
                ? "Saving…"
                : status === "error"
                  ? "Try again"
                  : "Save to gallery"
            }
            nextIcon={isUploading ? <Spinner /> : <UploadIcon />}
          />
        )}
      </CardFooter>
    </Card>
  )
}
