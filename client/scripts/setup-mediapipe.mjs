// Prepares the files background removal serves from public/:
//  - copies MediaPipe's WASM runtime out of node_modules, so its version always
//    matches the installed @mediapipe/tasks-vision;
//  - downloads the selfie segmentation model, if it isn't there yet.
//
// Runs on `npm install` (postinstall) and with `npm run setup:mediapipe`.
// It never fails the install: problems are printed as warnings, and the app
// reports what is missing when background removal is used.

import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const wasmSource = path.join(
  root,
  "node_modules",
  "@mediapipe",
  "tasks-vision",
  "wasm",
)
const wasmTarget = path.join(root, "public", "mediapipe", "wasm")
const modelTarget = path.join(root, "public", "models", "selfie_segmenter.tflite")

async function copyWasm() {
  if (!existsSync(wasmSource)) {
    console.warn(
      `[mediapipe] ${wasmSource} not found. Is @mediapipe/tasks-vision installed?`,
    )
    return
  }
  // Start clean, so files from an older version can't linger.
  await rm(wasmTarget, { recursive: true, force: true })
  await mkdir(path.dirname(wasmTarget), { recursive: true })
  await cp(wasmSource, wasmTarget, { recursive: true })
  console.log("[mediapipe] copied the WASM runtime to public/mediapipe/wasm")
}

async function fetchModel() {
  if (existsSync(modelTarget)) return
  const response = await fetch(MODEL_URL)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  await mkdir(path.dirname(modelTarget), { recursive: true })
  await writeFile(modelTarget, Buffer.from(await response.arrayBuffer()))
  console.log("[mediapipe] downloaded selfie_segmenter.tflite to public/models")
}

try {
  await copyWasm()
} catch (error) {
  console.warn("[mediapipe] couldn't copy the WASM runtime:", error.message)
}

try {
  await fetchModel()
} catch (error) {
  console.warn(
    `[mediapipe] couldn't download the model (${error.message}). ` +
      `Download it yourself from ${MODEL_URL} ` +
      "and save it as public/models/selfie_segmenter.tflite",
  )
}
