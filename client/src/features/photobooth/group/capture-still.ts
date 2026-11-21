import { PHOTO_ASPECT } from "../constants"

/** The server's limit for one still is 6 MiB; leave room for the header. */
const MAX_STILL_BYTES = 5 * 1024 * 1024

function toBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/webp",
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Step one, instant: freezes the picture. Copies the camera element (the <video>, or the cutout
 * canvas while the background is removed) into a canvas of its own: the centre of the feed cropped
 * to 4:3, mirrored like the preview, with the filter burned in. The same crop as the solo
 * photobooth. Everything here is synchronous, so the moment of the shot is the moment this is
 * called; the slow part (encoding) comes after, in `encodeStill`. Returns null when the camera has
 * no picture yet.
 */
export function snapshotStill(
  source: HTMLVideoElement | HTMLCanvasElement | null,
  filter: string,
): HTMLCanvasElement | null {
  if (!source) return null

  const isVideo = source instanceof HTMLVideoElement
  const width = isVideo ? source.videoWidth : source.width
  const height = isVideo ? source.videoHeight : source.height
  if (!width || !height) return null

  let sw = width
  let sh = height
  if (width / height > PHOTO_ASPECT) sw = height * PHOTO_ASPECT
  else sh = width / PHOTO_ASPECT
  const sx = (width - sw) / 2
  const sy = (height - sh) / 2

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(sw)
  canvas.height = Math.round(sh)
  const context = canvas.getContext("2d")
  if (!context) return null

  context.filter = filter
  context.translate(canvas.width, 0)
  context.scale(-1, 1)
  context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Step two, slow (on a phone, a second or more): turns the frozen picture into an image file to
 * send. It is a full-size image, because the others draw the frame from it as it is.
 *
 * PNG keeps the transparent background of a cutout. If that is too big to send, WebP (which also
 * keeps transparency) is used instead.
 */
export async function encodeStill(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const png = await toBlob(canvas, "image/png")
  if (png && png.size <= MAX_STILL_BYTES) return png

  const webp = await toBlob(canvas, "image/webp", 0.92)
  if (webp && webp.type === "image/webp" && webp.size <= MAX_STILL_BYTES) {
    return webp
  }
  // Last resort: a smaller WebP, so the shot isn't lost.
  return toBlob(canvas, "image/webp", 0.8)
}
