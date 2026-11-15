import type { CameraFilter, TimeInterval, Experience, PhotoLayout } from "./types"

export const LAYOUTS: PhotoLayout[] = [
  { id: "single", name: "Single", shots: 1, columns: 1 },
  { id: "duo", name: "Duo", shots: 2, columns: 1 },
  { id: "strip", name: "Strip", shots: 3, columns: 1 },
  { id: "classic-strip", name: "Classic strip", shots: 4, columns: 1 },
  { id: "grid", name: "3×2 Grid", shots: 6, columns: 2 },
  // 4 rows by 2 columns.
  { id: "grid-4x2", name: "4×2 Grid", shots: 8, columns: 2 },
]

export const FILTERS: CameraFilter[] = [
  { id: "none", name: "Original", css: "none" },
  { id: "mono", name: "B&W", css: "grayscale(1) contrast(1.1)" },
  { id: "sepia", name: "Sepia", css: "sepia(0.8)" },
  {
    id: "vintage",
    name: "Vintage",
    css: "sepia(0.4) contrast(1.1) saturate(1.3) hue-rotate(-10deg)",
  },
  { id: "vivid", name: "Vivid", css: "saturate(1.8) contrast(1.1)" },
  {
    id: "cinematic",
    name: "Cinematic",
    css: "contrast(1.25) saturate(0.9) brightness(0.95) hue-rotate(-5deg)",
  }
]

export const INTERVALS: TimeInterval[] = [
  { id: "three", seconds: 3 },
  { id: "five", seconds: 5 },
  { id: "seven", seconds: 7 },
  { id: "nine", seconds: 10 },
]

export const DEFAULT_EXPERIENCE: Experience = {
  filterId: "none",
  intervalId: "five",
  removeBackground: false
}

/** Preview and captured photos share this ratio so what you see is what you get. */
export const PHOTO_ASPECT = 4 / 3

export function getFilter(id: string): CameraFilter {
  return FILTERS.find((filter) => filter.id === id) ?? FILTERS[0]
}

export function getIntervalSeconds(id: string): number {
  return INTERVALS.find((interval) => interval.id === id)?.seconds ?? INTERVALS[0].seconds
}

/** Lowercase hex, so they compare cleanly with <input type="color"> values. */
export const FRAME_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Cream", value: "#fdf6e3" },
  { name: "Black", value: "#18181b" },
  { name: "Rose", value: "#fbcfe8" },
  { name: "Peach", value: "#fed7aa" },
  { name: "Butter", value: "#fef08a" },
  { name: "Mint", value: "#bbf7d0" },
  { name: "Sky", value: "#bae6fd" },
  { name: "Lavender", value: "#ddd6fe" },
]

export const DEFAULT_FRAME_COLOR = "#ffffff"
