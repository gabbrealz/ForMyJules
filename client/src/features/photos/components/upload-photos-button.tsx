import { useRef, type ChangeEvent } from "react"
import { UploadIcon } from "lucide-react"

import { Button } from "#components/ui/button"
import { Spinner } from "#components/ui/spinner"
import { useUploadPhotos } from "../hooks/use-upload-photos.ts"
import type { Photo } from "../types.ts"

export function UploadPhotosButton({
  onUploaded,
}: {
  /** Called with the photos that were saved, once the whole batch has finished. */
  onUploaded?: (photos: Photo[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, progress, uploading } = useUploadPhotos({ onUploaded })

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // Copy first: clearing the input empties the live FileList.
    const files = Array.from(event.target.files ?? [])
    event.target.value = "" // so picking the same files again still fires onChange
    void upload(files)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        tabIndex={-1}
        onChange={handleChange}
      />
      <Button
        type="button"
        hasRipple={true}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Spinner /> : <UploadIcon data-icon="inline-start" />}
        {uploading && progress
          ? `Uploading ${progress.done}/${progress.total}…`
          : "Upload Photos"}
      </Button>
    </>
  )
}
