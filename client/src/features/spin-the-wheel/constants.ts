export const DEFAULT_ENTRIES = [
  "Ali",
  "Beatriz",
  "Charles",
  "Diya",
  "Eric",
  "Fatima",
  "Gabriel",
  "Hanna",
]

/**
 * Pastel slice palette. Same lightness/chroma band as the brand palette in
 * globals.css (apricot is the brand's own), with hues spread around the wheel.
 * Canvas can't read CSS variables, so these are literal oklch() values.
 */
export const SLICE_COLORS: readonly string[] = [
  "oklch(0.89 0.07 65)", // apricot (brand)
  "oklch(0.92 0.05 355)", // pink
  "oklch(0.96 0.06 300)", // lavender
  "oklch(0.91 0.05 245)", // sky
  "oklch(0.95 0.06 190)", // aqua
  "oklch(0.94 0.08 150)", // mint
  "oklch(0.95 0.09 105)", // butter
  "oklch(0.92 0.08 25)", // peach
]

const FALLBACK_COLOR = "oklch(0.89 0.07 65)"

export const LABEL_COLOR = "oklch(0.29 0.035 52)"
export const SEPARATOR_COLOR = "oklch(0.996 0.006 80)"
export const EMPTY_WHEEL_COLOR = "oklch(0.95 0.055 95)"

export const BORDER_FILL = "oklch(0.996 0.006 80)"
/** Number of waves (bumps) around the outer edge. */
export const BORDER_WAVES = 20
/** Band thickness as a fraction of the wheel's outer radius. */
export const BORDER_BAND = 0.12
/** Wave height (crest to mid-line) as a fraction of the wheel's outer radius. */
export const BORDER_AMPLITUDE = 0.025

export const WHEEL_FONT_FAMILY = '"Nunito Variable", "DM Sans Variable", sans-serif'

export function getSliceColor(index: number, count: number): string {
  const length = SLICE_COLORS.length
  // When count % length === 1 the last slice would repeat the first colour
  // right next to it, so pick a colour from the opposite side of the palette.
  const repeatsFirst = count > 1 && index === count - 1 && index % length === 0
  const slot = repeatsFirst ? length / 2 : index % length
  return SLICE_COLORS[slot] ?? FALLBACK_COLOR
}
