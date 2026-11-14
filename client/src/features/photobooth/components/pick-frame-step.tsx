import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "cn"
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  RefreshCwIcon,
  UploadIcon,
} from "lucide-react"

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

import { DEFAULT_FRAME_COLOR } from "../constants"
import { FRAME_COLORS } from "../frame-colors"
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

/** How long the copy button shows its "copied" check. */
const COPIED_RESET_MS = 1500

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

/**
 * Accepts "#rgb", "#rrggbb" and the same without the "#". Returns the lowercase
 * "#rrggbb" form that <input type="color"> and the canvas expect, or null.
 */
function parseHex(value: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null
  let hex = match[1].toLowerCase()
  if (hex.length === 3) hex = [...hex].map((char) => char + char).join("")
  return `#${hex}`
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // No Clipboard API (e.g. an insecure context): fall back to execCommand.
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.append(area)
    area.select()
    const copied = document.execCommand("copy")
    area.remove()
    return copied
  }
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
  const copyTimerRef = useRef<number | undefined>(undefined)

  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [color, setColor] = useState(DEFAULT_FRAME_COLOR)
  // What's typed in the hex box. It can be half-typed or invalid, so it is
  // kept apart from `color`, which only ever holds a valid "#rrggbb".
  const [hexInput, setHexInput] = useState(DEFAULT_FRAME_COLOR.toUpperCase())
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const ready = images.length === layout.shots
  const isUploading = status === "uploading"
  const isDone = status === "done"
  const controlsLocked = isUploading || isDone
  const isHexInvalid = parseHex(hexInput) === null

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

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), [])

  // For the swatches and the colour picker, which always give a valid colour.
  const applyColor = (value: string) => {
    setColor(value)
    setHexInput(value.toUpperCase())
  }

  // Typing: apply the colour as soon as the text is a valid hex code.
  const handleHexChange = (value: string) => {
    setHexInput(value)
    const parsed = parseHex(value)
    if (parsed) setColor(parsed)
  }

  const copyColor = async () => {
    if (!(await copyText(color.toUpperCase()))) return
    setCopied(true)
    window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(
      () => setCopied(false),
      COPIED_RESET_MS,
    )
  }

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
            <FieldLabel htmlFor="frame-color-hex">Frame colour</FieldLabel>

            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map(({ name, value }) => (
                <button
                  key={value}
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={color.toLowerCase() === value}
                  disabled={controlsLocked}
                  onClick={() => applyColor(value)}
                  style={{ backgroundColor: value }}
                  className={cn(
                    "size-9 rounded-full border-2 border-border transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-50",
                    color.toLowerCase() === value &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pick a frame colour"
                value={color}
                disabled={controlsLocked}
                onChange={(event) => applyColor(event.target.value)}
                className="h-10 w-20 shrink-0 cursor-pointer rounded-sm border bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {/* One bordered box: the hex input, with the copy button attached at the right. */}
              <div
                className={cn(
                  "flex flex-1 h-10 min-w-0 items-center overflow-hidden rounded-sm border focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                  isHexInvalid && "border-destructive",
                  controlsLocked && "opacity-50",
                )}
              >
                <input
                  id="frame-color-hex"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={7}
                  value={hexInput}
                  disabled={controlsLocked}
                  aria-invalid={isHexInvalid || undefined}
                  onChange={(event) => handleHexChange(event.target.value)}
                  // Drop half-typed or invalid text and show the colour in use.
                  onBlur={() => setHexInput(color.toUpperCase())}
                  className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-sm uppercase outline-none disabled:cursor-not-allowed"
                />
                <div className="h-full border-l">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Copy colour code"
                    aria-label="Copy colour code"
                    onClick={copyColor}
                    className="size-10 rounded-none"
                  >
                    {copied ? <CheckIcon className="size-4" /> : <CopyIcon />}
                  </Button>
                </div>
              </div>
            </div>

            <span className="sr-only" role="status">
              {copied ? "Colour code copied" : ""}
            </span>
            <FieldDescription>
              Pick a preset, choose a colour, or type a hex code.
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
