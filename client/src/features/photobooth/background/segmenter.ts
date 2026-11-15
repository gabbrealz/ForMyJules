import {
  FilesetResolver,
  ImageSegmenter,
  type ImageSegmenterResult,
} from "@mediapipe/tasks-vision"

// Both are served from this app's public/ folder. `npm run setup:mediapipe`
// (also run by `npm install`) puts them there; see scripts/setup-mediapipe.mjs.
export const SEGMENTER_MODEL_URL = "/models/selfie_segmenter.tflite"
export const MEDIAPIPE_WASM_PATH = "/mediapipe/wasm"

/**
 * Flip this if the cutout comes out inverted (you disappear and the background
 * stays). The mask is meant to be 1 for the person, 0 for the background.
 */
export const INVERT_MASK = false

/**
 * Width of the copy of each frame that is sent to the model. The model works on
 * 256px anyway, and a small input means a small mask, which keeps the readback
 * and upload tiny. The shader scales the mask back up smoothly.
 */
export const SEGMENT_INPUT_WIDTH = 256

export type PersonMask = NonNullable<
  ImageSegmenterResult["confidenceMasks"]
>[number]

export type LoadedSegmenter = {
  segmenter: ImageSegmenter
  labels: string[]
}

async function create(delegate: "GPU" | "CPU"): Promise<LoadedSegmenter> {
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH)
  const segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL, delegate },
    runningMode: "VIDEO",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  })
  return { segmenter, labels: segmenter.getLabels() }
}

// One segmenter for the whole app: loading the runtime and model is the slow part.
let loading: Promise<LoadedSegmenter> | null = null

export function loadSegmenter(): Promise<LoadedSegmenter> {
  if (!loading) {
    loading = load().catch((error) => {
      loading = null // let a later attempt try again
      throw error
    })
  }
  return loading
}

/**
 * Starts loading in the background so the segmenter is ready when someone turns
 * background removal on. Safe to call any number of times, and it never throws:
 * a failure is reported later, when background removal is actually used.
 */
export function preloadBackgroundRemoval(): void {
  loadSegmenter().catch(() => {})
}

async function load(): Promise<LoadedSegmenter> {
  // Check the files people most often forget, so the error says what is wrong.
  await assertFile(
    [SEGMENTER_MODEL_URL],
    "model file",
    "Run `npm run setup:mediapipe`, or put selfie_segmenter.tflite in public/models/.",
  )
  await assertFile(
    [
      `${MEDIAPIPE_WASM_PATH}/vision_wasm_internal.js`,
      `${MEDIAPIPE_WASM_PATH}/vision_wasm_module_internal.js`,
    ],
    "MediaPipe WASM files",
    "Run `npm run setup:mediapipe`.",
  )

  try {
    return await create("GPU")
  } catch (error) {
    console.warn("GPU segmenter failed, falling back to CPU:", error)
    return await create("CPU")
  }
}

/**
 * Passes if any of `urls` is a real file. A missing file in a single-page app is
 * answered with index.html and a 200, so the content type is checked as well.
 */
async function assertFile(urls: string[], what: string, hint: string) {
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: "HEAD" })
      const type = response.headers.get("content-type") ?? ""
      if (response.ok && !type.includes("text/html")) return
    } catch {
      // Try the next URL.
    }
  }
  throw new Error(`The ${what} weren't found at ${urls[0]}. ${hint}`)
}

// VIDEO mode needs strictly increasing timestamps, also across callers.
let lastTimestamp = 0
export function nextTimestamp(): number {
  lastTimestamp = Math.max(performance.now(), lastTimestamp + 1)
  return lastTimestamp
}

/** The mask where 1 means "person". */
export function pickPersonMask(
  result: ImageSegmenterResult,
  labels: string[],
): PersonMask | undefined {
  const masks = result.confidenceMasks
  if (!masks || masks.length === 0) return undefined

  const byLabel = labels.findIndex((label) =>
    /person|foreground|selfie/i.test(label),
  )
  // Without a usable label: a two-mask result is [background, person].
  const index = byLabel >= 0 ? byLabel : masks.length > 1 ? 1 : 0
  return masks[Math.min(index, masks.length - 1)]
}
