import { CatIcon } from "lucide-react"

import { APP_NAME } from "#config/brand"
import type { PageDef } from "../services/scrapbook"

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
    case "blank":
      return null
  }
}
