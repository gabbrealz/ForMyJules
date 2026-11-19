import { useEffect, useRef } from "react"
import { cn } from "cn"

import { Spinner } from "#components/ui/spinner"

import { getFilter } from "../constants"
import type { RemotePreview } from "../rtc/use-peer-mesh"
import { useBoothSessionContext } from "../session/booth-session-context"

function PreviewTile({
  name,
  preview,
  filter,
}: {
  name: string
  preview: RemotePreview | undefined
  filter: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stream = preview?.stream ?? null

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  const failed = preview?.state === "failed"

  return (
    <li className="relative aspect-4/3 overflow-hidden rounded-lg border bg-black/90">
      {/* Mirrored and filtered like the photo that will be taken, so it matches the result. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ filter }}
        className={cn("size-full -scale-x-100 object-cover", !stream && "hidden")}
      />
      {!stream && (
        <div className="absolute inset-0 grid place-items-center p-2 text-center text-xs text-cream">
          {failed ? (
            "Can't show their camera. Their photos will still arrive."
          ) : (
            <Spinner className="size-5" />
          )}
        </div>
      )}
      <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/55 px-1.5 text-[11px] leading-5 font-medium text-white">
        {name}
      </span>
    </li>
  )
}

/**
 * The other people's live cameras, small, so everyone can see how the others look before the
 * countdown. Purely a preview: nothing here is used for the photos.
 */
export function RemotePreviews({
  previews,
  className,
}: {
  previews: ReadonlyMap<number, RemotePreview>
  className?: string
}) {
  const { state, me } = useBoothSessionContext()
  if (!state) return null

  const others = state.members.filter((member) => member.id !== me)
  if (others.length === 0) return null
  const filter = getFilter(state.config.filterId).css

  return (
    <ul
      className={cn(
        "grid gap-2",
        others.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3",
        className,
      )}
    >
      {others.map((member) => (
        <PreviewTile
          key={member.id}
          name={member.name}
          preview={previews.get(member.id)}
          filter={filter}
        />
      ))}
    </ul>
  )
}
