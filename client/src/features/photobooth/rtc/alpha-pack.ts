// Sending a cutout (a person without their background) to the others.
//
// A video call can't carry transparency: its codecs (VP8, VP9, H.264) have no alpha channel in
// WebRTC. So the cutout is sent as an ordinary, opaque video of twice the width, in two halves:
//
//   | colour, on black | matte (white = person) |
//
// The sender draws both halves with plain 2D canvas operations (no pixel reading), and the
// receiver turns them back into a picture with transparency. Nothing is segmented a second time:
// the matte is the one the sender's own background removal already made, so the others see the
// same cutout the sender does. No extra library is needed.

/** Each half. Small on purpose: this is a preview, the photo itself is sent separately. */
export const PACK_WIDTH = 384
export const PACK_HEIGHT = 288

/** Matte values at or below this are treated as fully transparent: video compression noise. */
const MATTE_FLOOR = 8

export type PackSource = HTMLVideoElement | HTMLCanvasElement

function sourceSize(source: PackSource): { width: number; height: number } {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.width, height: source.height }
}

/**
 * Draws `source` into the box, filling it and cropping the overflow around the centre (not
 * mirrored). Returns false while the source has no picture yet.
 */
export function drawCover(
  context: CanvasRenderingContext2D,
  source: PackSource,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  const { width: sourceWidth, height: sourceHeight } = sourceSize(source)
  if (!sourceWidth || !sourceHeight) return false

  const boxAspect = width / height
  let sw = sourceWidth
  let sh = sourceHeight
  if (sourceWidth / sourceHeight > boxAspect) sw = sh * boxAspect
  else sh = sw / boxAspect
  const sx = (sourceWidth - sw) / 2
  const sy = (sourceHeight - sh) / 2

  context.drawImage(source, sx, sy, sw, sh, x, y, width, height)
  return true
}

/**
 * Draws `source` at a scale that depends only on its SHORT side, with the overflow cropped and
 * the rest left empty (not mirrored). Used to put several people into one scene: every camera is
 * scaled so its short side fills the box's height, whatever its shape, so faces come out the
 * same size. A portrait phone (720x1280) therefore isn't blown up to fill a landscape box the way
 * `drawCover` would do; it keeps its size and is cropped top and bottom.
 *
 * A picture wider than the box is cropped evenly on both sides. A narrower one is placed by
 * `anchor` (0 against the left edge, 1 against the right, 0.5 centred), and what is left of the
 * box stays empty (transparent, for a cutout).
 */
export function drawFit(
  context: CanvasRenderingContext2D,
  source: PackSource,
  x: number,
  y: number,
  width: number,
  height: number,
  anchor = 0.5,
): boolean {
  const { width: sourceWidth, height: sourceHeight } = sourceSize(source)
  if (!sourceWidth || !sourceHeight) return false

  const scale = height / Math.min(sourceWidth, sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const slack = width - drawWidth
  const offset = slack <= 0 ? slack / 2 : slack * anchor

  context.save()
  context.beginPath()
  context.rect(x, y, width, height)
  context.clip() // what overflows must not spill into the neighbouring half or slice
  context.drawImage(
    source,
    0,
    0,
    sourceWidth,
    sourceHeight,
    x + offset,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  )
  context.restore()
  return true
}

/**
 * Packs the camera, or its cutout canvas, into the colour-plus-matte picture. Draw into `canvas`
 * as often as needed and send its `captureStream()`.
 *
 * A plain video (no cutout yet, or the model is still loading) is packed with a matte that is
 * white over the whole picture, so the receiver can always unpack it the same way and the person
 * just appears uncut.
 */
export class AlphaPacker {
  readonly canvas = document.createElement("canvas")
  private readonly context: CanvasRenderingContext2D
  private readonly matte = document.createElement("canvas")
  private readonly matteContext: CanvasRenderingContext2D

  constructor() {
    this.canvas.width = PACK_WIDTH * 2
    this.canvas.height = PACK_HEIGHT
    this.matte.width = PACK_WIDTH
    this.matte.height = PACK_HEIGHT

    const context = this.canvas.getContext("2d")
    const matteContext = this.matte.getContext("2d")
    if (!context || !matteContext) throw new Error("2D canvas isn't available.")
    this.context = context
    this.matteContext = matteContext
  }

  /**
   * `anchor`: null fills the picture with `drawCover`. A number places it with `drawFit` (for one
   * shared scene), against the left (0) or right (1) edge if it is narrower than the picture.
   */
  draw(source: PackSource | null, anchor: number | null = null): void {
    const { context, matteContext } = this
    const place = (target: CanvasRenderingContext2D, from: PackSource) =>
      anchor === null
        ? drawCover(target, from, 0, 0, PACK_WIDTH, PACK_HEIGHT)
        : drawFit(target, from, 0, 0, PACK_WIDTH, PACK_HEIGHT, anchor)

    context.fillStyle = "#000"
    context.fillRect(0, 0, PACK_WIDTH * 2, PACK_HEIGHT)
    if (!source) return

    // Left: the colour. Drawn over black, so the transparent area is black.
    if (!place(context, source)) return

    // Right: the matte. Draw the picture where it goes, then turn it white keeping its alpha
    // (`source-in`): white where the picture is, scaled by the cutout's alpha, and nothing where
    // it isn't (the bands beside a narrow picture, or a plain video's whole picture is opaque).
    // Over black that is a grey picture.
    matteContext.globalCompositeOperation = "source-over"
    matteContext.clearRect(0, 0, PACK_WIDTH, PACK_HEIGHT)
    place(matteContext, source)
    matteContext.globalCompositeOperation = "source-in"
    matteContext.fillStyle = "#fff"
    matteContext.fillRect(0, 0, PACK_WIDTH, PACK_HEIGHT)
    matteContext.globalCompositeOperation = "source-over"
    context.drawImage(this.matte, PACK_WIDTH, 0)
  }
}

/**
 * Turns a received packed video back into a picture with transparency, on `canvas` (the size of
 * one half). The per-pixel work is one small loop (about 110,000 pixels), done only when the video
 * shows a new frame.
 */
export class AlphaUnpacker {
  readonly canvas = document.createElement("canvas")
  private readonly outputContext: CanvasRenderingContext2D
  private readonly scratch = document.createElement("canvas")
  private readonly scratchContext: CanvasRenderingContext2D
  private readonly image: ImageData
  private lastTime = -1

  constructor() {
    this.canvas.width = PACK_WIDTH
    this.canvas.height = PACK_HEIGHT
    this.scratch.width = PACK_WIDTH * 2
    this.scratch.height = PACK_HEIGHT

    const output = this.canvas.getContext("2d")
    const scratch = this.scratch.getContext("2d", { willReadFrequently: true })
    if (!output || !scratch) throw new Error("2D canvas isn't available.")
    this.outputContext = output
    this.scratchContext = scratch
    this.image = output.createImageData(PACK_WIDTH, PACK_HEIGHT)
  }

  /** Refreshes `canvas` from the video. Returns false while there is no picture yet. */
  update(video: HTMLVideoElement): boolean {
    if (video.readyState < 2 || !video.videoWidth) return false
    if (video.currentTime === this.lastTime) return true // nothing new to unpack
    this.lastTime = video.currentTime

    const rowStride = PACK_WIDTH * 2 * 4
    this.scratchContext.drawImage(video, 0, 0, PACK_WIDTH * 2, PACK_HEIGHT)
    const packed = this.scratchContext.getImageData(
      0,
      0,
      PACK_WIDTH * 2,
      PACK_HEIGHT,
    ).data
    const out = this.image.data

    for (let y = 0; y < PACK_HEIGHT; y += 1) {
      for (let x = 0; x < PACK_WIDTH; x += 1) {
        const colour = y * rowStride + x * 4
        const matte = colour + PACK_WIDTH * 4
        const o = (y * PACK_WIDTH + x) * 4

        const alpha = packed[matte]
        if (alpha <= MATTE_FLOOR) {
          out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0
          continue
        }
        // The colour was drawn over black, so it is the colour times the alpha: undo that.
        const scale = alpha >= 250 ? 1 : 255 / alpha
        out[o] = Math.min(255, packed[colour] * scale)
        out[o + 1] = Math.min(255, packed[colour + 1] * scale)
        out[o + 2] = Math.min(255, packed[colour + 2] * scale)
        out[o + 3] = alpha
      }
    }

    this.outputContext.putImageData(this.image, 0, 0)
    return true
  }
}
