import { PHOTO_ASPECT } from "./constants"
import type { PhotoLayout } from "./types"

// All sizes are in canvas pixels. A 4-shot strip comes out ~1950px tall, which
// stays under the 2048px edge that uploadPhoto downscales to, so the saved
// image keeps the resolution drawn here.
const CELL_WIDTH = 600
const CELL_HEIGHT = CELL_WIDTH / PHOTO_ASPECT
const PADDING = 40
const GAP = 24
const CORNER_RADIUS = 12

/** Decodes the captured data URLs so they can be drawn on a canvas. */
export function loadPhotos(sources: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    sources.map(async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      return image
    }),
  )
}

/**
 * Draws the frame: a `color` background with the photos laid out in
 * `layout.columns` columns. Resizing the canvas clears it, so every call
 * redraws from scratch.
 */
export function renderFrame(
  canvas: HTMLCanvasElement,
  layout: PhotoLayout,
  images: HTMLImageElement[],
  color: string,
) {
  const columns = layout.columns
  const rows = Math.ceil(layout.shots / columns)

  canvas.width = PADDING * 2 + columns * CELL_WIDTH + (columns - 1) * GAP
  canvas.height = PADDING * 2 + rows * CELL_HEIGHT + (rows - 1) * GAP

  const context = canvas.getContext("2d")
  if (!context) return

  context.fillStyle = color
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingQuality = "high"

  images.slice(0, layout.shots).forEach((image, index) => {
    const x = PADDING + (index % columns) * (CELL_WIDTH + GAP)
    const y = PADDING + Math.floor(index / columns) * (CELL_HEIGHT + GAP)

    context.save()
    context.beginPath()
    context.roundRect(x, y, CELL_WIDTH, CELL_HEIGHT, CORNER_RADIUS)
    context.clip()
    context.drawImage(image, x, y, CELL_WIDTH, CELL_HEIGHT)
    context.restore()
  })
}

/** Exports exactly what the canvas shows as a PNG file, ready for uploadPhoto. */
export function canvasToFile(
  canvas: HTMLCanvasElement,
  name: string,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Couldn't export the frame as an image."))
        return
      }
      resolve(new File([blob], name, { type: "image/png" }))
    }, "image/png")
  })
}
