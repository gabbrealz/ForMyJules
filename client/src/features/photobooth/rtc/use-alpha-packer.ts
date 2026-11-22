import { useEffect, useRef, useState, type RefObject } from "react"

import { AlphaPacker, type PackSource } from "./alpha-pack"

const PACK_FPS = 20

/**
 * While `enabled`, packs the camera's cutout (colour and matte side by side, see alpha-pack.ts)
 * into a video track that can be sent to the others. `sourceRef` is where the cutout comes from:
 * the capture element of <CameraPreview>, which is its cutout canvas once background removal is
 * ready and the plain video before that. Returns null while not enabled.
 *
 * `anchor`: null fills the picture with the camera. A number (see `sceneAnchor`) is for one shared
 * scene: the camera is scaled by its short side, so faces come out the same size on a portrait
 * phone and a landscape webcam, and a narrower picture is pushed to the left (0) or right (1).
 * It can change while running (people come and go) without restarting the track.
 */
export function useAlphaPacker(
  enabled: boolean,
  sourceRef: RefObject<PackSource | null>,
  anchor: number | null,
): MediaStreamTrack | null {
  const [track, setTrack] = useState<MediaStreamTrack | null>(null)

  const anchorRef = useRef(anchor)
  useEffect(() => {
    anchorRef.current = anchor
  }, [anchor])

  useEffect(() => {
    if (!enabled) return

    let packer: AlphaPacker
    try {
      packer = new AlphaPacker()
    } catch (error) {
      console.warn("Can't pack the cutout for the preview:", error)
      return
    }

    const next = packer.canvas.captureStream(PACK_FPS).getVideoTracks()[0] ?? null
    setTrack(next)

    const timer = window.setInterval(
      () => packer.draw(sourceRef.current, anchorRef.current),
      1000 / PACK_FPS,
    )

    return () => {
      window.clearInterval(timer)
      next?.stop()
      setTrack(null)
    }
  }, [enabled, sourceRef])

  return track
}
