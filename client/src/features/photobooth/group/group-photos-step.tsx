import { useCallback, useRef, useState } from "react"
import { cn } from "cn"
import {
  CameraIcon,
  CheckIcon,
  PlayIcon,
  RefreshCwIcon,
  SquareIcon,
  TriangleAlertIcon,
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

import { CameraPreview } from "../components/camera-preview"
import { STEP_BUTTON_CLASS, StepActions } from "../components/step-actions"
import { LAYOUTS, getFilter, getIntervalSeconds } from "../constants"
import type { CameraState } from "../hooks/use-camera"
import { useBoothSessionContext } from "../session/booth-session-context"
import { captureStill } from "./capture-still"
import { describeDenied } from "./denied-message"
import { GroupRoster } from "./group-roster"
import { getRoundProgress, shotCount } from "./round-timeline"
import type { GroupStills } from "./use-group-stills"
import { useAutoReady } from "./use-auto-ready"
import { useServerNow, useShotScheduler } from "./use-round-clock"
import { WaitingForLeader } from "./waiting-for-leader"

/** The camera window's buttons: bigger than the step buttons. */
const CAMERA_BUTTON_CLASS = "h-14 min-w-44 px-10 has-[>svg]:px-10"

type GroupPhotosStepProps = {
  camera: CameraState
  stills: GroupStills
}

/**
 * Step 3 of the group flow. Everyone opens their camera window; once everyone is ready the leader
 * starts one countdown that all screens share. Each camera takes shot i at the same agreed moment
 * and sends the full-size still to everyone else.
 */
export function GroupPhotosStep({ camera, stills }: GroupPhotosStepProps) {
  const { state, me, self, isLeader, denied, actions } =
    useBoothSessionContext()

  const captureRef = useRef<HTMLVideoElement | HTMLCanvasElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  // 0 means no flash. Each capture bumps it, which mounts a fresh flash element.
  const [flashId, setFlashId] = useState(0)

  const { ready, visible } = useAutoReady(isOpen, !!camera.stream)

  const round = state?.round ?? null
  const layout = LAYOUTS.find((candidate) => candidate.id === state?.config.layoutId)
  const filter = getFilter(state?.config.filterId ?? "none").css

  const isRunning = round?.status === "running"
  const inRound = round !== null && me !== null && round.roster.includes(me)
  const canShoot = isOpen && ready && self?.status === "active" && inRound

  const now = useServerNow(isOpen && isRunning)
  const progress = round && isRunning ? getRoundProgress(round, now) : null

  const onShot = useCallback(
    async (shot: number) => {
      const blob = await captureStill(captureRef.current, filter)
      if (!blob) return
      setFlashId((id) => id + 1)
      stills.addOwn(shot, blob)
    },
    [filter, stills],
  )
  useShotScheduler({ round, enabled: canShoot, onShot })

  if (!state || !layout) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Take your photos</CardTitle>
          <CardDescription>
            The leader needs to choose a layout first.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const total = layout.shots
  const taken = round ? shotCount(round) : 0
  const isComplete = round?.status === "complete"
  const isStopped = round?.status === "stopped"
  const everyoneReady = state.members
    .filter((member) => member.status === "active")
    .every((member) => member.ready)
  const hasEveryStill = isComplete && stills.hasAll(taken)
  const error = describeDenied(denied, ["start", "stop", "continue", "retake", "go"])

  const closeWindow = () => {
    setIsOpen(false)
    setFlashId(0)
  }

  const nextShot = Math.min(taken, total - 1)
  const slots = Array.from({ length: total }, (_, shot) => {
    const mine = me === null ? undefined : stills.get(me, shot)
    const received = state.members.filter(
      (member) => stills.get(member.id, shot) !== undefined,
    ).length
    return { shot, mine, received }
  })
  const rosterSize = round?.roster.length ?? state.members.length

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Take your photos</CardTitle>
          <CardDescription>
            {total === 1
              ? "One photo, one countdown."
              : `${total} photos, one every ${getIntervalSeconds(state.config.intervalId)} seconds.`}{" "}
            {isLeader
              ? "Open your camera. When everyone is ready, start the countdown."
              : "Open your camera and wait for the leader to start."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <GroupRoster showReady />

          {self?.status === "waiting" && (
            <p className="rounded-lg border p-3 text-sm text-muted-foreground">
              A round is already in progress. You'll join the next one.
            </p>
          )}

          {camera.error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
            >
              <p>{camera.error}</p>
              <Button type="button" size="sm" variant="outline" onClick={camera.retry}>
                <RefreshCwIcon /> Try again
              </Button>
            </div>
          )}

          {self?.status !== "waiting" && !isComplete && (
            <div className="flex justify-center">
              <Button
                type="button"
                className={cn(STEP_BUTTON_CLASS, "h-12")}
                onClick={() => setIsOpen(true)}
                disabled={!camera.stream}
              >
                <CameraIcon /> Open Camera
              </Button>
            </div>
          )}

          <ol
            className="mx-auto grid w-full max-w-2xl place-items-center gap-2"
            style={{
              gridTemplateColumns: `repeat(${total === 6 ? 3 : Math.min(total, 4)}, minmax(0, 1fr))`,
            }}
          >
            {slots.map(({ shot, mine, received }) => (
              <li
                key={shot}
                className={cn(
                  "relative aspect-4/3 w-full max-w-md overflow-hidden rounded-lg border bg-muted",
                  isRunning && shot === nextShot && "ring-2 ring-primary",
                )}
              >
                {mine ? (
                  <img
                    src={mine.url}
                    alt={`Your photo ${shot + 1}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-sm text-muted-foreground">
                    {shot + 1}
                  </span>
                )}
                {received > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute right-1 bottom-1 text-[10px]"
                  >
                    {received}/{rosterSize}
                  </Badge>
                )}
              </li>
            ))}
          </ol>

          {isComplete && !hasEveryStill && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              Collecting everyone's photos…
            </p>
          )}
          {error && (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>

        <CardFooter>
          {isLeader ? (
            <StepActions
              onBack={() => actions.go(2)}
              onNext={() => actions.go(4)}
              nextDisabled={!hasEveryStill}
            />
          ) : (
            <WaitingForLeader what="to continue" />
          )}
        </CardFooter>
      </Card>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? setIsOpen(true) : closeWindow())}
      >
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-svh w-svw max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background/40 p-0 backdrop-blur-sm sm:max-w-none"
        >
          <DialogTitle className="sr-only">Take your photos</DialogTitle>
          <DialogDescription className="sr-only">
            Camera view. The leader starts the countdown for everyone.
          </DialogDescription>

          <div className="flex shrink-0 items-center justify-between gap-3 p-4 pb-0">
            <GroupRoster showReady />
            <Button
              type="button"
              variant="ghost"
              aria-label="Close camera"
              onClick={closeWindow}
              className="size-11"
            >
              <XIcon className="size-6" />
            </Button>
          </div>

          {!visible && (
            <p
              role="alert"
              className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-background/80 p-3 text-sm text-destructive"
            >
              <TriangleAlertIcon className="size-4" /> Keep this tab in front, or
              your photos will be missed.
            </p>
          )}

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-4">
            <CameraPreview
              camera={camera}
              filter={filter}
              captureRef={captureRef}
              removeBackground={state.config.removeBackground}
              className="max-h-full w-full max-w-3xl"
            >
              <Badge variant="secondary" className="absolute top-3 left-3">
                Photo {Math.min(taken + 1, total)} of {total}
              </Badge>

              {progress && progress.kind !== "finished" && (
                <div
                  key={`countdown-${progress.shot}-${progress.secondsLeft}-${progress.kind}`}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 grid place-items-center animate-in fade-in zoom-in-50 duration-300"
                >
                  <span className="font-heading text-8xl font-bold text-cream drop-shadow-lg">
                    {progress.secondsLeft}
                  </span>
                </div>
              )}

              {flashId > 0 && (
                <div
                  key={`flash-${flashId}`}
                  aria-hidden
                  onAnimationEnd={() => setFlashId(0)}
                  className="pointer-events-none absolute inset-0 bg-white animate-out fade-out duration-500 fill-mode-forwards motion-reduce:hidden"
                />
              )}

              <span className="sr-only" aria-live="assertive">
                {progress && progress.kind !== "finished" ? progress.secondsLeft : ""}
              </span>
            </CameraPreview>

            <ol className="flex flex-wrap justify-center gap-2">
              {slots.map(({ shot, mine }) => (
                <li
                  key={shot}
                  className="aspect-4/3 h-14 overflow-hidden rounded-md border bg-muted"
                >
                  {mine ? (
                    <img
                      src={mine.url}
                      alt={`Your photo ${shot + 1}`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-xs text-muted-foreground">
                      {shot + 1}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 p-4 pb-6">
            {isLeader ? (
              <>
                {isRunning ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={CAMERA_BUTTON_CLASS}
                    onClick={actions.stop}
                  >
                    <SquareIcon /> Stop
                  </Button>
                ) : isComplete ? (
                  <Button
                    type="button"
                    className={CAMERA_BUTTON_CLASS}
                    onClick={closeWindow}
                  >
                    <CheckIcon /> Done
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className={CAMERA_BUTTON_CLASS}
                    onClick={isStopped ? actions.continueRound : actions.start}
                    disabled={!everyoneReady || !ready}
                  >
                    <PlayIcon /> {isStopped ? "Continue" : "Start"}
                  </Button>
                )}
                {round && !isRunning && (
                  <Button
                    type="button"
                    variant="outline"
                    className={CAMERA_BUTTON_CLASS}
                    onClick={actions.retake}
                  >
                    <RefreshCwIcon /> Retake all
                  </Button>
                )}
              </>
            ) : isComplete ? (
              <Button
                type="button"
                className={CAMERA_BUTTON_CLASS}
                onClick={closeWindow}
              >
                <CheckIcon /> Done
              </Button>
            ) : (
              <WaitingForLeader what={isRunning ? "to finish" : "to start"} />
            )}
          </div>

          {isLeader && !isRunning && !isComplete && !everyoneReady && (
            <p className="pb-4 text-center text-sm text-muted-foreground">
              Waiting for everyone's camera to be ready.
            </p>
          )}
          {error && (
            <p role="alert" className="pb-4 text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
