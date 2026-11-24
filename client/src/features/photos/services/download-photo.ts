import type { Photo } from "../types.ts"

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}

function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? mimeType.split("/")[1] ?? "jpg"
}

/**
 * Saves the full-size image to the device. The `download` attribute is ignored on
 * cross-origin links (the image lives on Cloudinary), so the file is fetched
 * first and saved from a local blob URL. Throws if the request fails.
 */
export async function downloadPhoto(photo: Photo): Promise<void> {
  const response = await fetch(photo.fullUrl)
  if (!response.ok) throw new Error(`Download failed (${response.status})`)

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement("a")
    link.href = url
    link.download = `photo-${photo.id}.${extensionFor(blob.type)}`
    document.body.append(link)
    link.click()
    link.remove()
  } finally {
    // Revoke on a later tick so the browser has started reading the blob.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
