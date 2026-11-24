import { thumbHashToDataURL } from "thumbhash"
import type { Photo } from "./types.ts"

/**
 * Photos requested per page. The API accepts 1 to 100 (default 40), so 60 stays
 * safely under the cap while being 50% above the default: one page covers
 * several screens of scrolling. A page is only metadata (a few hundred bytes per
 * photo); the browser downloads each image later, when its tile nears the viewport.
 */
export const PHOTO_PAGE_SIZE = 60

/** Gap between tiles in px. Keep in sync with the `gap-3` classes in photo-grid.tsx. */
export const GRID_GAP_PX = 12
/** Thumbnails are 400px on the long edge, so ~200px columns stay sharp on 2x screens. */
export const MIN_COLUMN_WIDTH_PX = 200
export const MIN_COLUMNS = 3
export const MAX_COLUMNS = 6

export function columnsForWidth(width: number): number {
  const fit = Math.floor(
    (width + GRID_GAP_PX) / (MIN_COLUMN_WIDTH_PX + GRID_GAP_PX),
  )
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, fit))
}

/**
 * Masonry layout: each item goes into the currently shortest column. `ratio` is
 * height / width. Items already placed never move when more are appended, which
 * keeps the wall from reshuffling as new pages arrive (CSS `columns` would).
 */
export function distributeIntoColumns<T extends { ratio: number }>(
  items: T[],
  columnCount: number,
): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => [])
  const heights: number[] = Array.from({ length: columnCount }, () => 0)

  for (const item of items) {
    let shortest = 0
    for (let i = 1; i < columnCount; i++) {
      if ((heights[i] ?? 0) < (heights[shortest] ?? 0)) shortest = i
    }
    columns[shortest]?.push(item)
    heights[shortest] = (heights[shortest] ?? 0) + item.ratio
  }
  return columns
}

/** Adds a fetched page to the end, skipping photos that are already listed. */
export function appendUnique(current: Photo[], incoming: Photo[]): Photo[] {
  const seen = new Set(current.map((photo) => photo.id))
  return [...current, ...incoming.filter((photo) => !seen.has(photo.id))]
}

/** Puts newly uploaded photos first (newest first), replacing any duplicates. */
export function prependUnique(current: Photo[], incoming: Photo[]): Photo[] {
  const ids = new Set(incoming.map((photo) => photo.id))
  // createdAt is ISO 8601 in a fixed format, so string order is time order.
  const newestFirst = [...incoming].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  return [...newestFirst, ...current.filter((photo) => !ids.has(photo.id))]
}

/** "Taken on March 5, 2026 at 3:30 PM" in the viewer's locale, or a fallback when the date is unknown. */
export function formatTakenAt(takenAt: string | null): string {
  const unknown = "Date taken unknown"
  if (!takenAt) return unknown
  const date = new Date(takenAt)
  if (Number.isNaN(date.getTime())) return unknown
  return `Taken on ${date.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}`
}

/** Decodes a stored base64 ThumbHash into a tiny blurred image URL, or undefined if it's invalid. */
export function thumbhashToDataUrl(thumbhash: string): string | undefined {
  try {
    const bytes = Uint8Array.from(atob(thumbhash), (char) => char.charCodeAt(0))
    return thumbHashToDataURL(bytes)
  } catch {
    return undefined
  }
}
