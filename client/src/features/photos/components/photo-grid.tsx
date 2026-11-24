import { useMemo } from "react"

import { Skeleton } from "#components/ui/skeleton"
import { useColumnCount } from "../hooks/use-column-count.ts"
import type { Photo } from "../types.ts"
import { distributeIntoColumns } from "../utils.ts"
import { PhotoTile } from "./photo-tile.tsx"

// Heights (relative to width) cycled through for placeholder tiles, so loading
// states look like a gallery wall instead of a uniform grid.
const SKELETON_RATIOS = [1.25, 0.8, 1, 1.5, 0.75, 1.1]

type Cell = { key: string; ratio: number; photo?: Photo }

/**
 * Masonry wall of photo tiles. `skeletonRows` adds that many rows of placeholder
 * tiles after the photos (e.g. while the next page loads).
 */
export function PhotoGrid({
  photos,
  skeletonRows = 0,
  onOpenPhoto,
}: {
  photos: Photo[]
  skeletonRows?: number
  onOpenPhoto: (photo: Photo) => void
}) {
  const [containerRef, columnCount] = useColumnCount()

  const columns = useMemo(() => {
    const cells: Cell[] = photos.map((photo) => ({
      key: photo.id,
      ratio: photo.h / photo.w,
      photo,
    }))
    for (let i = 0; i < skeletonRows * columnCount; i++) {
      cells.push({
        key: `skeleton-${i}`,
        ratio: SKELETON_RATIOS[i % SKELETON_RATIOS.length] ?? 1,
      })
    }
    return distributeIntoColumns(cells, columnCount)
  }, [photos, skeletonRows, columnCount])

  return (
    <div ref={containerRef} className="flex items-start gap-3 md:gap-4 xl:gap-5">
      {columns.map((column, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5 md:gap-6 lg:gap-7 xl:gap-8">
          {column.map((cell) =>
            cell.photo ? (
              <PhotoTile key={cell.key} photo={cell.photo} onOpen={onOpenPhoto} />
            ) : (
              <Skeleton
                key={cell.key}
                className="w-full rounded-lg"
                style={{ aspectRatio: `1 / ${cell.ratio}` }}
              />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
