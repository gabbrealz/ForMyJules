import type { ComponentType } from "react"
import { CatIcon } from "lucide-react"
import { cn } from "cn"

import { APP_NAME } from "#config/brand"
import type { PageDef, Photo } from "../services/scrapbook"

function Tape({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("absolute h-5 w-16 bg-apricot/70 shadow-sm", className)}
    />
  )
}

function Polaroid({ photo, className }: { photo: Photo; className?: string }) {
  return (
    <figure
      className={cn("relative bg-white p-2.5 pb-3 shadow-md", className)}
      style={{ rotate: `${photo.tilt}deg` }}
    >
      <Tape className="-top-2.5 left-1/2 -translate-x-1/2 -rotate-3" />
      <img
        src={photo.src}
        alt={photo.alt}
        draggable={false}
        className="aspect-4/3 w-full object-cover"
      />
      <figcaption className="mt-2 text-center font-heading text-sm font-semibold text-brown/80">
        {photo.caption}
      </figcaption>
    </figure>
  )
}

function Photos({ photos }: { photos: Photo[] }) {
  const solo = photos.length === 1
  return (
    <div className="flex size-full flex-col items-center justify-center p-5">
      {photos.map((photo, i) => (
        <Polaroid
          key={photo.src}
          photo={photo}
          className={cn(
            solo
              ? "w-4/5"
              : i % 2 === 0
                ? "w-[64%] self-start"
                : "-mt-5 w-[64%] self-end"
          )}
        />
      ))}
    </div>
  )
}

function Note({
  title,
  body,
  icon: Icon,
}: {
  title: string
  body: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex size-full items-center justify-center p-6">
      <div className="relative w-full -rotate-1 bg-vanilla p-5 shadow-md">
        <Tape className="-top-3 left-6 rotate-3" />
        <span className="mb-3 flex size-9 items-center justify-center rounded-full bg-apricot text-brown">
          <Icon className="size-5" />
        </span>
        <h2 className="font-heading text-xl font-bold text-balance text-brown">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-pretty text-brown/75">
          {body}
        </p>
      </div>
    </div>
  )
}

function Cover() {
  return (
    <div className="size-full bg-brown p-4 text-cream">
      {/* Stitched edge */}
      <div className="flex size-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-apricot/60 p-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-apricot text-brown">
          <CatIcon className="size-9" />
        </span>
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-balance">
          Our Scrapbook
        </h2>
        <p className="text-sm text-cream/70">{APP_NAME}</p>
      </div>
    </div>
  )
}

function BackCover() {
  return (
    <div className="flex size-full items-end justify-center bg-brown p-8 text-apricot/50">
      <CatIcon className="size-8" />
    </div>
  )
}

export function PageContent({ page }: { page: PageDef }) {
  switch (page.kind) {
    case "cover":
      return <Cover />
    case "back":
      return <BackCover />
    case "photos":
      return <Photos photos={page.photos} />
    case "note":
      return <Note title={page.title} body={page.body} icon={page.icon} />
  }
}
