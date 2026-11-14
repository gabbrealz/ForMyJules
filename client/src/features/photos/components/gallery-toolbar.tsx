import type { Photo } from "../types.ts"
import { UploadPhotosButton } from "./upload-photos-button.tsx"

export function GalleryToolbar({
  canUpload,
  onUploaded,
}: {
  /** Guests are view-only, so they get no upload button. */
  canUpload: boolean
  onUploaded?: (photos: Photo[]) => void
}) {
  // Nothing else lives here yet; don't draw an empty bar.
  if (!canUpload) return null

  return (
    <div
      role="toolbar"
      aria-label="Gallery actions"
      className="mb-6 flex flex-wrap items-center justify-end gap-2"
    >
      <UploadPhotosButton onUploaded={onUploaded} />
    </div>
  )
}
