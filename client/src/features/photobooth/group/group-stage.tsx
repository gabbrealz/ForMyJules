import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import { cn } from "cn"

import { Spinner } from "#components/ui/spinner"

import { getFilter } from "../constants"
import { AlphaUnpacker, drawFit, type PackSource } from "../rtc/alpha-pack"
import type { RemotePreview } from "../rtc/use-peer-mesh"
import { useBoothSessionContext } from "../session/booth-session-context"
import { sceneAnchor } from "./scene-anchor"

// One cell of the frame, in canvas pixels. Same 4:3 as a photo.
const STAGE_WIDTH = 640
const STAGE_HEIGHT = 480
const MAX_FPS = 30

/** A received camera, played in a video the stage reads from. It is on the page but invisible. */
function HiddenVideo({
  id,
  stream,
  videos,
}: {
  id: number
  stream: MediaStream
  /** Where the stage finds the playing video of each person. */
  videos: RefObject<Map<number, HTMLVideoElement>>
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const registry = videos.current
    element.srcObject = stream
    registry.set(id, element)
    void element.play().catch(() => {
      // Autoplay is allowed for muted video; if it still fails the stage just shows nothing.
    })
    return () => {
      registry.delete(id)
    }
  }, [id, stream, videos])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 size-px opacity-0"
    />
  )
}

type GroupStageProps = {
  /** This person's own camera: the cutout canvas or the plain video (see <CameraPreview captureRef>). */
  localSourceRef: RefObject<PackSource | null>
  /** The others' live cameras. */
  previews: ReadonlyMap<number, RemotePreview>
  /** This person's camera is running. */
  cameraReady: boolean
  /** Overlays: a badge, the countdown, the flash. */
  children?: ReactNode
  className?: string
}

/**
 * Everyone's live camera in ONE picture, laid out like a cell of the final frame:
 * - 'separate-cells': side by side, one slice each, in join order;
 * - 'one-scene': the cutouts layered on top of each other, the first to join at the back.
 * It is drawn in the leader's frame colour, mirrored and filtered like the photos, so the preview
 * is what each shot will look like. Purely a preview: the photos are taken from each camera.
 */
export function GroupStage({
  localSourceRef,
  previews,
  cameraReady,
  children,
  className,
}: GroupStageProps) {
  const { state, me } = useBoothSessionContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const videos = useRef(new Map<number, HTMLVideoElement>())
  const unpackers = useRef(new Map<number, AlphaUnpacker>())

  const members = (state?.members ?? []).filter(
    (member) => member.status === "active",
  )
  const memberKey = members.map((member) => member.id).join(",")
  const scene = state?.config.scene ?? "separate-cells"
  const removeBackground = state?.config.removeBackground ?? false
  const frameColor = state?.config.frameColor ?? "#ffffff"
  const filter = getFilter(state?.config.filterId ?? "none").css

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const ids = memberKey ? memberKey.split(",").map(Number) : []
    const roster = ids.map((id) => ({ id, status: "active" }))

    /** What to draw for one person, or null if they have no picture yet. */
    const sourceFor = (id: number): PackSource | null => {
      if (id === me) return cameraReady ? localSourceRef.current : null

      const video = videos.current.get(id)
      if (!video || video.readyState < 2) return null
      if (!removeBackground) return video

      // A cutout arrives packed (colour and matte side by side): unpack it to get the transparency.
      let unpacker = unpackers.current.get(id)
      if (!unpacker) {
        unpacker = new AlphaUnpacker()
        unpackers.current.set(id, unpacker)
      }
      return unpacker.update(video) ? unpacker.canvas : null
    }

    /**
     * Mirrored inside its box, like a selfie camera and like the photos.
     * Scaled by the short side only, so a portrait phone doesn't get its face enlarged next to a
     * laptop camera. One scene: the picture is pushed to its side of the scene (`anchor`). Slices:
     * it is cropped to its slice (and only scaled up if it would otherwise not fill it).
     */
    const drawMirrored = (
      source: PackSource,
      x: number,
      width: number,
      anchor: number,
    ) => {
      context.save()
      context.beginPath()
      context.rect(x, 0, width, STAGE_HEIGHT)
      context.clip()
      context.translate(x + width, 0)
      context.scale(-1, 1)
      drawFit(
        context,
        source,
        0,
        0,
        width,
        STAGE_HEIGHT,
        anchor,
        scene !== "one-scene",
      )
      context.restore()
    }

    let frame = 0
    let lastDraw = 0
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw)
      if (time - lastDraw < 1000 / MAX_FPS) return
      lastDraw = time

      context.filter = "none"
      context.fillStyle = frameColor
      context.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
      context.filter = filter

      const sliceWidth = STAGE_WIDTH / Math.max(1, ids.length)
      ids.forEach((id, index) => {
        const source = sourceFor(id)
        if (!source) return
        if (scene === "one-scene") {
          // A received cutout was already placed by its sender (it is 4:3, so this changes nothing
          // for it); this person's own camera is placed here, the same way.
          drawMirrored(source, 0, STAGE_WIDTH, sceneAnchor(roster, id))
        } else {
          drawMirrored(source, index * sliceWidth, sliceWidth, 0.5)
        }
      })
    }
    frame = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(frame)
  }, [memberKey, me, cameraReady, scene, removeBackground, frameColor, filter, localSourceRef])

  // Forget the unpackers of people who left.
  useEffect(() => {
    const here = new Set(memberKey.split(",").map(Number))
    for (const id of [...unpackers.current.keys()]) {
      if (!here.has(id)) unpackers.current.delete(id)
    }
  }, [memberKey])

  if (!state) return null

  const sliceWidthPercent = 100 / Math.max(1, members.length)
  const statusOf = (id: number): "ready" | "connecting" | "failed" => {
    if (id === me) return cameraReady ? "ready" : "connecting"
    const preview = previews.get(id)
    if (preview?.stream) return "ready"
    return preview?.state === "failed" ? "failed" : "connecting"
  }

  return (
    <div
      style={{ backgroundColor: frameColor }}
      className={cn(
        "relative aspect-4/3 w-full overflow-hidden rounded-xl border shadow-lg",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        role="img"
        aria-label="Live preview of everyone's cameras, laid out like the frame"
        className="size-full"
      />

      {members
        .filter((member) => member.id !== me)
        .map((member) => {
          const stream = previews.get(member.id)?.stream
          return stream ? (
            <HiddenVideo
              key={member.id}
              id={member.id}
              stream={stream}
              videos={videos}
            />
          ) : null
        })}

      {/* Names and connection status, over the slice each person is in. */}
      {members.map((member, index) => {
        const status = statusOf(member.id)
        const separate = scene === "separate-cells"
        // In one scene everyone shares the whole picture, so only the ones with a problem are listed.
        if (!separate && status === "ready") return null
        return (
          <div
            key={member.id}
            className={cn(
              "pointer-events-none absolute bottom-0 flex items-end p-1.5",
              !separate && "left-0",
            )}
            style={
              separate
                ? {
                    left: `${index * sliceWidthPercent}%`,
                    width: `${sliceWidthPercent}%`,
                  }
                : undefined
            }
          >
            <span className="flex max-w-full items-center gap-1.5 truncate rounded bg-black/55 px-1.5 text-[11px] leading-5 font-medium text-white">
              {status === "connecting" && <Spinner className="size-3" />}
              <span className="truncate">
                {member.name}
                {member.id === me && " (you)"}
                {status === "failed" && " · can't show camera"}
              </span>
            </span>
          </div>
        )
      })}

      {children}
    </div>
  )
}
