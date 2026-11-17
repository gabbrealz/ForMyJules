import { createContext, useContext } from "react"

import type { PhotoboothMode } from "../types"

/**
 * Holds the mode chosen before the stepper. It stays `null` while the choice is
 * still being made; the page only mounts the stepper once it is set.
 */
export const PhotoboothModeContext = createContext<PhotoboothMode | null>(null)

/**
 * The mode chosen for this visit (`solo` or `with-others`). Any component inside
 * the stepper can read it without it being passed down as a prop.
 */
export function usePhotoboothMode(): PhotoboothMode {
  const mode = useContext(PhotoboothModeContext)
  if (mode === null) {
    throw new Error(
      "usePhotoboothMode must be used inside the photobooth steps, after a mode has been chosen.",
    )
  }
  return mode
}
