import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "cn"
import {
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  RefreshCwIcon,
  UploadIcon,
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
import { STEP_BUTTON_CLASS } from "./step-actions"

/**
 * No offset, so the frame is outlined evenly on every side: a thin grey edge
 * (visible on light and dark backgrounds) plus a soft dark glow.
 */
const FRAME_SHADOW = "0 0 0 1px rgba(128, 128, 128, 0.15), 0 0 24px 4px rgba(0, 0, 0, 0.25)";

/** Full width on phones, where the footer buttons stack; natural width from sm up. */
const FOOTER_BUTTON_CLASS = cn(STEP_BUTTON_CLASS, "w-full sm:w-auto")

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

  // The preview canvas is also what gets saved and downloaded, so they can't
  // drift apart.
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
      await uploadPhoto(file, { kind: "photobooth", signal: controller.signal })
      setStatus("done")
    } catch (err) {
      if (controller.signal.aborted) return
      console.error("Error saving photobooth frame:", err)
      setError(describeError(err))
      setStatus("error")
    }
  }

  // Works for every role, guests included: it never touches the server.
  const download = async () => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return

    try {
      const file = await canvasToFile(canvas, `photobooth-${Date.now()}.png`)
      const url = URL.createObjectURL(file)
      const link = document.createElement("a")
      link.href = url
      link.download = file.name
      document.body.append(link)
      link.click()
      link.remove()
      // Revoke later: some browsers need the URL alive while the download starts.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error("Error downloading photobooth frame:", err)
      setError("Couldn't download the frame. Please try again.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Pick a frame</CardTitle>
        <CardDescription>
          {canSave
            ? "Choose a colour for your frame, then save it to the gallery or download it."
            : "Choose a colour for your frame, then download it."}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2">
        {/* Generous padding so the frame's shadow has room on every side. */}
        <div className="relative grid min-h-48 place-items-center rounded-xl border bg-muted/50 p-5 sm:p-8">
          {!ready && !error && <Spinner className="size-6" />}
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Preview of your framed photos"
            style={{ boxShadow: FRAME_SHADOW }}
            className={cn(
              "h-auto max-h-[60svh] w-auto max-w-full",
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
              gallery. You can still download it.
            </FieldDescription>
          )}

          {error && <FieldError>{error}</FieldError>}
        </FieldGroup>
      </CardContent>

      <CardFooter>
        {isDone ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckIcon className="size-4" /> Saved to the gallery
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className={FOOTER_BUTTON_CLASS}
                onClick={onStartOver}
              >
                <RefreshCwIcon /> Take more photos
              </Button>
              <Button
                type="button"
                className={FOOTER_BUTTON_CLASS}
                onClick={() => navigate("/gallery")}
              >
                View gallery
              </Button>
            </div>
          </div>
        ) : (
          // Phones: one full-width button per row, Save on top and Back at the
          // bottom (the reversed order). sm and up: Back on the left, Download
          // and Save together on the right.
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className={FOOTER_BUTTON_CLASS}
              onClick={onBack}
              disabled={isUploading}
            >
              <ArrowLeftIcon /> Back
            </Button>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className={FOOTER_BUTTON_CLASS}
                onClick={download}
                disabled={!ready || isUploading}
              >
                <DownloadIcon /> Download
              </Button>
              <Button
                type="button"
                className={FOOTER_BUTTON_CLASS}
                onClick={save}
                disabled={!ready || !canSave || isUploading}
              >
                {isUploading ? <Spinner /> : <UploadIcon />}
                {isUploading
                  ? "Saving…"
                  : status === "error"
                    ? "Try again"
                    : "Save to gallery"}
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
