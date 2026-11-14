import { useCallback, useMemo, useState } from "react"
import { ImageOffIcon } from "lucide-react"
import { cn } from "cn"

import type { Photo } from "../types.ts"
import { thumbhashToDataUrl } from "../utils.ts"

type LoadState = "loading" | "loaded" | "failed"

function describe(photo: Photo): string {
  if (!photo.takenAt) return "Photo"
  const date = new Date(photo.takenAt)
  if (Number.isNaN(date.getTime())) return "Photo"
  return `Photo taken on ${date.toLocaleDateString(undefined, { dateStyle: "long" })}`
}

export function PhotoTile({ photo }: { photo: Photo }) {
  const [state, setState] = useState<LoadState>("loading")
  const placeholder = useMemo(
    () => thumbhashToDataUrl(photo.thumbhash),
    [photo.thumbhash],
  )

  // A cached image can finish before React attaches onLoad, so check on mount.
  const imageRef = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) setState("loaded")
  }, [])

  return (
    <div
      className="relative w-full overflow-hidden bg-muted"
      // Reserves the exact space before the image arrives, so nothing jumps.
      style={{ aspectRatio: `${photo.w} / ${photo.h}` }}
    >
      {placeholder && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-300",
            // Fades out rather than staying behind, which would show through transparent images.
            state === "loaded" && "opacity-0",
          )}
          style={{ backgroundImage: `url(${placeholder})` }}
        />
      )}
      {state === "failed" ? (
        <div
          role="img"
          aria-label="This photo couldn't be loaded"
          className="absolute inset-0 flex items-center justify-center text-muted-foreground"
        >
          <ImageOffIcon className="size-6" aria-hidden="true" />
        </div>
      ) : (
        <img
          ref={imageRef}
          src={photo.thumbUrl}
          alt={describe(photo)}
          width={photo.w}
          height={photo.h}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-300",
            state !== "loaded" && "opacity-0",
          )}
        />
      )}
    </div>
  )
}
