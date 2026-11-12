import { PHOTO_ASPECT } from "./constants"
import type { PhotoLayout } from "./types"

// All sizes are canvas pixels. The tallest frame (4 rows) comes out ~1970px,
// just under the 2048px edge uploadPhoto downscales to, so the saved image keeps
// the resolution drawn here.
const CELL_WIDTH = 560
const CELL_HEIGHT = CELL_WIDTH / PHOTO_ASPECT
const GAP = 24
const PADDING_X = 48
const PADDING_TOP = 40
// Extra empty space under the photos, like the border of a printed photo strip.
const PADDING_BOTTOM = 160

export type FrameCell = {
  x: number
  y: number
  width: number
  height: number
}

export type FrameMetrics = {
  width: number
  height: number
  /** One rect per photo, in layout order. */
  cells: FrameCell[]
}

/**
 * The frame's size and where each photo goes. Shared by the canvas renderer and
 * the layout previews so they always show the same design.
 */
export function getFrameMetrics(layout: PhotoLayout): FrameMetrics {
  const { columns, shots } = layout
  const rows = Math.ceil(shots / columns)

  const cells = Array.from({ length: shots }, (_, index) => ({
    x: PADDING_X + (index % columns) * (CELL_WIDTH + GAP),
    y: PADDING_TOP + Math.floor(index / columns) * (CELL_HEIGHT + GAP),
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
  }))

  return {
    width: PADDING_X * 2 + columns * CELL_WIDTH + (columns - 1) * GAP,
    height:
      PADDING_TOP + PADDING_BOTTOM + rows * CELL_HEIGHT + (rows - 1) * GAP,
    cells,
  }
}

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
 * Draws the frame: a `color` background with the photos placed by
 * getFrameMetrics, square-cornered. Resizing the canvas clears it, so every
 * call redraws from scratch.
 */
export function renderFrame(
  canvas: HTMLCanvasElement,
  layout: PhotoLayout,
  images: HTMLImageElement[],
  color: string,
) {
  const { width, height, cells } = getFrameMetrics(layout)
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) return

  context.fillStyle = color
  context.fillRect(0, 0, width, height)
  context.imageSmoothingQuality = "high"

  images.slice(0, cells.length).forEach((image, index) => {
    const cell = cells[index]
    context.drawImage(image, cell.x, cell.y, cell.width, cell.height)
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
