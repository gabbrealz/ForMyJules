import { useEffect, useState, type RefObject } from "react"

import { AlphaPacker, type PackSource } from "./alpha-pack"

const PACK_FPS = 20

/**
 * While `enabled`, packs the camera's cutout (colour and matte side by side, see alpha-pack.ts)
 * into a video track that can be sent to the others. `sourceRef` is where the cutout comes from:
 * the capture element of <CameraPreview>, which is its cutout canvas once background removal is
 * ready and the plain video before that. Returns null while not enabled.
 */
export function useAlphaPacker(
  enabled: boolean,
  sourceRef: RefObject<PackSource | null>,
): MediaStreamTrack | null {
  const [track, setTrack] = useState<MediaStreamTrack | null>(null)

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
      () => packer.draw(sourceRef.current),
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
