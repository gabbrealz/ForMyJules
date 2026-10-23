import { HeartIcon, SparklesIcon } from "lucide-react"
import type { ComponentType } from "react"

export type Photo = {
  src: string
  alt: string
  caption: string
  // Degrees. Small tilts make the polaroids feel stuck on by hand.
  tilt: number
}

export type PageDef =
  | { kind: "cover" }
  | { kind: "back" }
  | { kind: "photos"; photos: Photo[] }
  | {
      kind: "note"
      title: string
      body: string
      icon: ComponentType<{ className?: string }>
    }

// Placeholder photos, same source as the backdrop in lib/brand.ts.
// Swap for real uploads (e.g. from Cloudinary) once the scrapbook has a backend.
function photo(seed: number, caption: string, tilt: number): Photo {
  return {
    src: `https://loremflickr.com/480/360/cat?lock=${seed}`,
    alt: "Placeholder photo of a cat",
    caption,
    tilt,
  }
}

// With the cover on, the page count must be even: cover + inner pages + back cover.
// Page 0 is the cover, odd indexes are left-hand pages, even indexes are right-hand pages.
export const PAGES: PageDef[] = [
  { kind: "cover" },
  {
    kind: "note",
    title: "Our story so far",
    body: "A place for the little things: the trips, the inside jokes, the ticket stubs and the photos we never want to lose.",
    icon: HeartIcon,
  },
  {
    kind: "photos",
    photos: [photo(21, "Sunday morning", -3), photo(22, "Rainy walk", 2.5)],
  },
  {
    kind: "photos",
    photos: [photo(23, "First trip together", 1.5)],
  },
  {
    kind: "note",
    title: "Keep a few words",
    body: "Notes, lists and small details about a day worth remembering will live here.",
    icon: SparklesIcon,
  },
  {
    kind: "photos",
    photos: [photo(24, "Golden hour", 2), photo(25, "Lazy afternoon", -2.5)],
  },
  {
    kind: "photos",
    photos: [photo(26, "Window seat", -1.5)],
  },
  { kind: "back" },
]
