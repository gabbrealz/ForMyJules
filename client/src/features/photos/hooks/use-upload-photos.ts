import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "#components/ui/toast"
import { HttpError } from "#services/http-client"
import { uploadPhoto } from "../services/upload-photo.ts"
import type { Photo } from "../types.ts"

/** How many photos are encoded and sent to Cloudinary at the same time. */
const UPLOAD_CONCURRENCY = 3

export type UploadProgress = {
  /** Photos finished so far, whether they worked or not. */
  done: number
  total: number
}

type Failure = { name: string; message: string }

// `fatal` means every remaining photo would fail the same way, so the batch stops.
function explain(error: unknown): { message: string; fatal: boolean } {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401:
        return {
          message: "Your session expired. Log in again to upload.",
          fatal: true,
        }
      case 403:
        return { message: "Your account can't upload photos.", fatal: true }
      case 429:
        return {
          message: "Too many uploads in a short time. Wait a few minutes and try again.",
          fatal: true,
        }
      case 507:
        return {
          message: "Storage is almost full, so new uploads are disabled.",
          fatal: true,
        }
    }
  }
  // createImageBitmap rejects with this when the browser can't decode the file (e.g. HEIC).
  if (error instanceof DOMException && error.name === "InvalidStateError") {
    return {
      message: "Couldn't read this image. Your browser may not support its format.",
      fatal: false,
    }
  }
  return {
    message: error instanceof Error ? error.message : "Something went wrong.",
    fatal: false,
  }
}

function reportResult(
  total: number,
  uploaded: number,
  failures: Failure[],
  fatal: string | null,
) {
  const failed = total - uploaded

  if (failed === 0) {
    toast.add({
      type: "success",
      title: uploaded === 1 ? "Photo uploaded" : `${uploaded} photos uploaded`,
    })
    return
  }

  let reason = fatal
  const first = failures.at(0)
  if (!reason && first) {
    reason = `${first.name}: ${first.message}`
    if (failures.length > 1) reason += ` (${failures.length - 1} more failed too.)`
  }

  toast.add({
    type: uploaded > 0 ? "warning" : "error",
    title:
      uploaded > 0
        ? `Uploaded ${uploaded} of ${total} photos`
        : failed === 1
          ? "Couldn't upload photo"
          : "Couldn't upload photos",
    description: reason ?? "Some photos couldn't be uploaded.",
    timeout: 8000,
  })
}

/**
 * Uploads a batch of files through uploadPhoto() (sign -> Cloudinary -> save),
 * a few at a time, then shows one summary toast. A batch that hits a problem
 * every photo would share (guest, storage full, rate limit, expired session)
 * stops early instead of failing file by file.
 *
 * It keeps going if the person navigates away, since the toast is global.
 */
export function useUploadPhotos({
  onUploaded,
}: { onUploaded?: (photos: Photo[]) => void } = {}) {
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const busyRef = useRef(false)
  const onUploadedRef = useRef(onUploaded)

  useEffect(() => {
    onUploadedRef.current = onUploaded
  }, [onUploaded])

  const upload = useCallback(async (files: File[]) => {
    if (files.length === 0 || busyRef.current) return
    busyRef.current = true

    const total = files.length
    const uploaded: Photo[] = []
    const failures: Failure[] = []
    const stop = { reason: null as string | null }
    let next = 0
    let finished = 0
    setProgress({ done: 0, total })

    async function worker() {
      while (stop.reason === null && next < total) {
        const file = files[next++]
        if (!file) break
        try {
          uploaded.push(await uploadPhoto(file))
        } catch (error) {
          const { message, fatal } = explain(error)
          if (fatal) stop.reason ??= message
          else failures.push({ name: file.name, message })
        }
        finished += 1
        setProgress({ done: finished, total })
      }
    }

    try {
      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, total) }, worker),
      )
    } finally {
      busyRef.current = false
      setProgress(null)
    }

    reportResult(total, uploaded.length, failures, stop.reason)
    if (uploaded.length > 0) onUploadedRef.current?.(uploaded)
  }, [])

  return { upload, progress, uploading: progress !== null }
}
