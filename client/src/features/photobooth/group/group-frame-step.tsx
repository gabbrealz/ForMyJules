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

import { STEP_BUTTON_CLASS } from "../components/step-actions"
import { LAYOUTS } from "../constants"
import { FRAME_COLORS } from "../frame-colors"
import { canvasToFile } from "../render-frame"
import { useBoothSessionContext } from "../session/booth-session-context"
import { describeDenied } from "./denied-message"
import {
  loadStillImage,
  renderGroupFrame,
  type GroupImages,
} from "./render-group-frame"
import { shotCount } from "./round-timeline"
import type { GroupStills } from "./use-group-stills"
import { WaitingForLeader } from "./waiting-for-leader"

const FRAME_SHADOW =
  "0 0 0 1px rgba(128, 128, 128, 0.15), 0 0 24px 4px rgba(0, 0, 0, 0.33)"
const FOOTER_BUTTON_CLASS = cn(STEP_BUTTON_CLASS, "w-full sm:w-auto")
/** The leader's colour picker fires on every drag step: send the colour once it settles. */
const COLOR_SEND_DELAY_MS = 150

function describeUploadError(error: unknown): string {
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
 * Step 4 of the group flow. Every screen draws the same frame from everyone's stills, in the
 * colour the leader picks. Only one person saves it to the gallery (the first admin or partner to
 * press Save); anyone can download it.
 */
export function GroupFrameStep({ stills }: { stills: GroupStills }) {
  const navigate = useNavigate()
  const user = useRequiredUser()
  const canSave = canManagePhotos(user)
  const { state, me, self, isLeader, denied, actions } =
    useBoothSessionContext()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const savingFor = useRef<number | null>(null)
  const imageCache = useRef(new Map<string, HTMLImageElement>())
  const colorTimer = useRef<number | undefined>(undefined)

  const [images, setImages] = useState<GroupImages>(new Map())
  const [complete, setComplete] = useState(false)
  const [pendingColor, setPendingColor] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const round = state?.round ?? null
  const layout = LAYOUTS.find((candidate) => candidate.id === state?.config.layoutId)
  const scene = state?.config.scene ?? "one-scene"
  const serverColor = state?.config.frameColor ?? "#ffffff"
  const color = isLeader && pendingColor ? pendingColor : serverColor
  const final = state?.final ?? null
  const saveStatus = final?.save.status ?? "none"
  const savedBy = state?.members.find((member) => member.id === final?.save.by)

  const count = round ? shotCount(round) : 0
  const rosterKey = round?.roster.join(",") ?? ""

  // Decode everyone's stills as they arrive; colour changes only redraw.
  useEffect(() => {
    if (!round) return
    let cancelled = false

    const load = async () => {
      const next = new Map<number, (HTMLImageElement | undefined)[]>()
      let allThere = true
      for (const id of round.roster) {
        const row: (HTMLImageElement | undefined)[] = []
        for (let shot = 0; shot < count; shot += 1) {
          const entry = stills.get(id, shot)
          if (!entry) {
            row.push(undefined)
            allThere = false
            continue
          }
          try {
            row.push(await loadStillImage(entry.url, imageCache.current))
          } catch {
            row.push(undefined)
            allThere = false
          }
        }
        next.set(id, row)
      }
      if (cancelled) return
      setImages(next)
      setComplete(allThere && count > 0)
    }
    void load()

    return () => {
      cancelled = true
    }
    // `rosterKey` stands in for round.roster, which is a new array on every state message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stills, stills.version, rosterKey, count])

  // The canvas is also what gets saved and downloaded, so they can't drift apart.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout || !round) return
    renderGroupFrame(canvas, layout, scene, round.roster, images, color)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, layout, scene, rosterKey, color])

  // Once the server shows my colour, stop overriding it.
  useEffect(() => {
    if (pendingColor !== null && pendingColor === serverColor) {
      setPendingColor(null)
    }
  }, [pendingColor, serverColor])

  const changeColor = (value: string) => {
    if (!isLeader) return
    setPendingColor(value)
    window.clearTimeout(colorTimer.current)
    colorTimer.current = window.setTimeout(
      () => actions.setConfig({ frameColor: value }),
      COLOR_SEND_DELAY_MS,
    )
  }

  // I pressed Save and the server gave me the claim: upload what is on screen, then report back.
  useEffect(() => {
    if (!final || final.save.status !== "saving" || final.save.by !== me) return
    if (savingFor.current === final.id || !complete) return
    const canvas = canvasRef.current
    if (!canvas) return

    savingFor.current = final.id
    const controller = new AbortController()
    abortRef.current = controller
    setLocalError(null)

    void (async () => {
      try {
        const file = await canvasToFile(canvas, `photobooth-${Date.now()}.png`)
        await uploadPhoto(file, { kind: "photobooth", signal: controller.signal })
        actions.finishSave()
      } catch (err) {
        if (controller.signal.aborted) return
        console.error("Error saving photobooth frame:", err)
        setLocalError(describeUploadError(err))
        savingFor.current = null
        actions.failSave()
      }
    })()
  }, [final, me, complete, actions])

  // Leaving the step cancels an upload in flight.
  useEffect(
    () => () => {
      abortRef.current?.abort()
      window.clearTimeout(colorTimer.current)
    },
    [],
  )

  // Works for everyone, guests included: it never touches the server.
  const download = async () => {
    const canvas = canvasRef.current
    if (!canvas || !complete) return
    try {
      const file = await canvasToFile(canvas, `photobooth-${Date.now()}.png`)
      const url = URL.createObjectURL(file)
      const link = document.createElement("a")
      link.href = url
      link.download = file.name
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error("Error downloading photobooth frame:", err)
      setLocalError("Couldn't download the frame. Please try again.")
    }
  }

  if (!state || !layout || !round) return null

  // Joined after the round began: there are no stills for this person to draw from.
  if (self?.status === "waiting") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Pick a frame</CardTitle>
          <CardDescription>
            A round is already in progress. You'll join the next one.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const isSaving = saveStatus === "saving"
  const savingByMe = isSaving && final?.save.by === me
  const isDone = saveStatus === "saved"
  const controlsLocked = !isLeader || isSaving || isDone
  const error =
    localError ?? describeDenied(denied, ["save-claim", "new-round", "go"])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Pick a frame</CardTitle>
        <CardDescription>
          {isLeader
            ? "Choose the frame colour for everyone, then save it to the gallery or download it."
            : "The leader chooses the frame colour. Anyone can save or download it."}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="relative grid min-h-48 place-items-center rounded-xl border bg-muted p-5 sm:p-8">
          {!complete && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-5" /> Collecting everyone's photos…
            </p>
          )}
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Preview of the group's framed photos"
            style={{ boxShadow: FRAME_SHADOW }}
            className={cn(
              "h-auto max-h-[60svh] w-auto max-w-full",
              !complete && "hidden",
            )}
          />
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel>Frame colour</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map(({ name, value }) => (
                <button
                  key={value}
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={color.toLowerCase() === value}
                  disabled={controlsLocked}
                  onClick={() => changeColor(value)}
                  style={{ backgroundColor: value }}
                  className={cn(
                    "size-9 rounded-full border-2 border-border transition-transform hover:scale-110 disabled:pointer-events-none",
                    color.toLowerCase() === value &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                />
              ))}
            </div>
            {isLeader && (
              <input
                type="color"
                aria-label="Pick a frame colour"
                value={color}
                disabled={controlsLocked}
                onChange={(event) => changeColor(event.target.value)}
                className="h-10 w-1/3 cursor-pointer rounded-sm border bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          </Field>

          {!canSave && (
            <FieldDescription>
              Guest accounts are view-only, so you can't save this to the
              gallery. You can still download it.
            </FieldDescription>
          )}
          {isSaving && !savingByMe && (
            <FieldDescription>
              {savedBy?.name ?? "Someone"} is saving this to the gallery.
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
              {savedBy ? ` by ${savedBy.name}` : ""}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                className={FOOTER_BUTTON_CLASS}
                onClick={download}
              >
                <DownloadIcon /> Download
              </Button>
              {isLeader ? (
                <Button
                  type="button"
                  variant="outline"
                  className={FOOTER_BUTTON_CLASS}
                  onClick={actions.newRound}
                >
                  <RefreshCwIcon /> Take more photos
                </Button>
              ) : (
                <WaitingForLeader what="to start another round" />
              )}
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
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {isLeader ? (
              <Button
                type="button"
                variant="outline"
                className={FOOTER_BUTTON_CLASS}
                // The server has no way back to the photos step except throwing the round away.
                onClick={actions.retake}
                disabled={isSaving}
              >
                <ArrowLeftIcon /> Retake photos
              </Button>
            ) : (
              <WaitingForLeader what="to continue" />
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className={FOOTER_BUTTON_CLASS}
                onClick={download}
                disabled={!complete}
              >
                <DownloadIcon /> Download
              </Button>
              <Button
                type="button"
                className={FOOTER_BUTTON_CLASS}
                onClick={actions.claimSave}
                disabled={!complete || !canSave || isSaving}
              >
                {savingByMe ? <Spinner /> : <UploadIcon />}
                {savingByMe ? "Saving…" : "Save to gallery"}
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
