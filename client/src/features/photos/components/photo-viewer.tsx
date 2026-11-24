import { useCallback, useState } from "react"
import {
  DownloadIcon,
  ImageOffIcon,
  LoaderCircleIcon,
  Trash2Icon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import { cn } from "cn"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog"
import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "#components/ui/dialog"
import { HttpError } from "#services/http-client"
import { usePanZoom, type PanZoom } from "../hooks/use-pan-zoom.ts"
import { downloadPhoto } from "../services/download-photo.ts"
import type { Photo } from "../types.ts"
import { formatTakenAt } from "../utils.ts"

type LoadState = "loading" | "loaded" | "failed"

const DOWNLOAD_ERROR = "Couldn't download the photo. Please try again."
const DELETE_ERROR = "Couldn't delete the photo. Please try again."

/**
 * The full-size image. The thumbnail (already cached from the grid) shows right
 * away and the full image fades in on top once it has loaded. Zooming and
 * dragging transform both together.
 */
function ViewerImage({
  photo,
  state,
  onStateChange,
  panZoom,
}: {
  photo: Photo
  state: LoadState
  onStateChange: (state: LoadState) => void
  panZoom: PanZoom
}) {
  // A cached image can finish before React attaches onLoad, so check on mount.
  const imageRef = useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete && image.naturalWidth > 0) onStateChange("loaded")
    },
    [onStateChange],
  )

  return (
    <div
      ref={panZoom.viewportRef}
      {...panZoom.handlers}
      className={cn(
        "relative size-full touch-none overflow-hidden select-none",
        panZoom.canPan && (panZoom.dragging ? "cursor-grabbing" : "cursor-grab"),
      )}
    >
      {state === "failed" ? (
        <div
          role="img"
          aria-label="This photo couldn't be loaded"
          className="flex size-full flex-col items-center justify-center gap-2 text-white/70"
        >
          <ImageOffIcon className="size-10" aria-hidden="true" />
          <p className="text-sm">Couldn't load this photo</p>
        </div>
      ) : (
        <div
          className={cn(
            "relative size-full origin-center",
            // Smooth for the zoom buttons, but not while dragging or the image would lag the pointer.
            !panZoom.dragging && "transition-transform duration-200 ease-out",
          )}
          style={{ transform: panZoom.transform }}
        >
          <img
            src={photo.thumbUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 size-full object-contain"
          />
          <img
            ref={imageRef}
            src={photo.fullUrl}
            alt={formatTakenAt(photo.takenAt)}
            decoding="async"
            draggable={false}
            onLoad={() => onStateChange("loaded")}
            onError={() => onStateChange("failed")}
            className={cn(
              "absolute inset-0 size-full object-contain transition-opacity duration-300",
              state !== "loaded" && "opacity-0",
            )}
          />
        </div>
      )}
    </div>
  )
}

function ViewerBody({
  photo,
  onClose,
  onDelete,
}: {
  photo: Photo
  onClose: () => void
  onDelete: (photo: Photo) => Promise<void>
}) {
  const [imageState, setImageState] = useState<LoadState>("loading")
  const panZoom = usePanZoom(photo.w, photo.h)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const busy = downloading || deleting
  const imageFailed = imageState === "failed"

  async function handleDownload() {
    setError(null)
    setDownloading(true)
    try {
      await downloadPhoto(photo)
    } catch {
      setError(DOWNLOAD_ERROR)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    setConfirmOpen(false)
    setError(null)
    setDeleting(true)
    try {
      // On success the photo leaves the list, which closes the viewer.
      await onDelete(photo)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : DELETE_ERROR)
      setDeleting(false)
    }
  }

  const iconButton = "text-white hover:bg-white/15 hover:text-white"

  return (
    <>
      <DialogTitle className="sr-only">Photo</DialogTitle>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-4 p-3 sm:p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButton}
          aria-label="Zoom out"
          title="Zoom out"
          disabled={imageFailed || !panZoom.canZoomOut}
          onClick={panZoom.zoomOut}
        >
          <ZoomOutIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButton}
          aria-label="Zoom in"
          title="Zoom in"
          disabled={imageFailed || !panZoom.canZoomIn}
          onClick={panZoom.zoomIn}
        >
          <ZoomInIcon aria-hidden="true" />
        </Button>
      </div>

      <div className="absolute top-0 right-0 z-10 flex items-center gap-4 p-3 sm:p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButton}
          aria-label="Download photo"
          title="Download"
          disabled={busy}
          onClick={() => void handleDownload()}
        >
          {downloading ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
          ) : (
            <DownloadIcon aria-hidden="true" />
          )}
        </Button>
        {photo.canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={iconButton}
            aria-label="Delete photo"
            title="Delete"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            {deleting ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2Icon aria-hidden="true" />
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButton}
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>

      {/* The image stage zooms in and out with the dialog; the overlay itself only fades. */}
      <div
        className={cn(
          "min-h-0 flex-1 px-4 pt-16 duration-200 sm:px-16",
          "group-data-[open]/popup:animate-in group-data-[open]/popup:zoom-in-95",
          "group-data-[closed]/popup:animate-out group-data-[closed]/popup:zoom-out-95",
        )}
      >
        <ViewerImage
          photo={photo}
          state={imageState}
          onStateChange={setImageState}
          panZoom={panZoom}
        />
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 px-4 py-6 text-center">
        <DialogDescription className="text-white/80">
          {formatTakenAt(photo.takenAt)}
        </DialogDescription>
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be permanently removed for everyone. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Full-screen viewer for one photo. Pass the photo to show, or null to close.
 * `onDelete` should reject if the deletion fails; the viewer shows the error and stays open.
 */
export function PhotoViewer({
  photo,
  onClose,
  onDelete,
}: {
  photo: Photo | null
  onClose: () => void
  onDelete: (photo: Photo) => Promise<void>
}) {
  // Keep showing the last photo while the dialog animates out.
  const [shown, setShown] = useState(photo)
  if (photo && photo !== shown) setShown(photo)

  return (
    <Dialog
      open={photo !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Override the default centered, max-w-md card so it fills the screen.
          "group/popup top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 ring-0 duration-200 sm:max-w-none",
          // The overlay only fades. Cancel the default zoom here; the image stage does the zooming instead.
          "data-open:[--tw-enter-scale:1]! data-closed:[--tw-exit-scale:1]!",
          "bg-black/95 text-white"
        )}
      >
        {shown && (
          // Keyed so load, zoom, download and delete state resets for each photo.
          <ViewerBody
            key={shown.id}
            photo={shown}
            onClose={onClose}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
