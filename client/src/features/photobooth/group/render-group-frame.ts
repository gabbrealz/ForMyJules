import { getFrameMetrics } from "../render-frame"
import type { PhotoLayout } from "../types"
import type { BoothScene } from "../session/types"

/** Everyone's decoded stills: member id -> one image per shot (undefined where one is missing). */
export type GroupImages = ReadonlyMap<number, readonly (HTMLImageElement | undefined)[]>

/** Decodes a still from its object URL. Resolves to the same image for a URL it has seen. */
export async function loadStillImage(
  url: string,
  cache: Map<string, HTMLImageElement>,
): Promise<HTMLImageElement> {
  const cached = cache.get(url)
  if (cached) return cached
  const image = new Image()
  image.src = url
  await image.decode()
  cache.set(url, image)
  return image
}

/** Draws `image` into the box, filling it and cropping the overflow around the centre. */
function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const boxAspect = width / height
  const imageAspect = image.naturalWidth / image.naturalHeight
  let sw = image.naturalWidth
  let sh = image.naturalHeight
  if (imageAspect > boxAspect) sw = sh * boxAspect
  else sh = sw / boxAspect
  const sx = (image.naturalWidth - sw) / 2
  const sy = (image.naturalHeight - sh) / 2
  context.drawImage(image, sx, sy, sw, sh, x, y, width, height)
}

/**
 * Draws the group's frame, from everyone's stills and the leader's frame colour. Every screen runs
 * this with the same inputs, so every screen draws the same picture, and the one that saves it
 * saves exactly what everyone saw.
 *
 * - 'one-scene': in each cell the cutouts are layered on top of each other, the first person to
 *   join at the back, the last at the front (`roster` is in join order).
 * - 'separate-cells': each cell is split into side-by-side parts, one per person, in join order.
 *
 * Resizing the canvas clears it, so every call redraws from scratch.
 */
export function renderGroupFrame(
  canvas: HTMLCanvasElement,
  layout: PhotoLayout,
  scene: BoothScene,
  roster: readonly number[],
  images: GroupImages,
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

  cells.forEach((cell, shot) => {
    if (scene === "one-scene") {
      for (const id of roster) {
        const image = images.get(id)?.[shot]
        if (image) context.drawImage(image, cell.x, cell.y, cell.width, cell.height)
      }
      return
    }

    const part = cell.width / roster.length
    roster.forEach((id, index) => {
      const image = images.get(id)?.[shot]
      if (!image) return
      context.save()
      context.beginPath()
      context.rect(cell.x + index * part, cell.y, part, cell.height)
      context.clip()
      drawCover(context, image, cell.x + index * part, cell.y, part, cell.height)
      context.restore()
    })
  })
}
