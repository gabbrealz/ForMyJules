import { useEffect } from "react"

import { preloadBackgroundRemoval } from "../background/segmenter"

/**
 * Starts loading background removal (WASM runtime, model, segmenter) when the
 * page opens, so it is ready by the time someone reaches the toggle in step 2.
 * It waits for the browser to be idle, so it doesn't compete with the page's
 * own loading.
 */
export function usePreloadBackgroundRemoval() {
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      // The timeout makes it run even if the browser never gets idle.
      const id = window.requestIdleCallback(preloadBackgroundRemoval, {
        timeout: 5000,
      })
      return () => window.cancelIdleCallback(id)
    }

    // Safari has no requestIdleCallback.
    const id = window.setTimeout(preloadBackgroundRemoval, 1000)
    return () => window.clearTimeout(id)
  }, [])
}
