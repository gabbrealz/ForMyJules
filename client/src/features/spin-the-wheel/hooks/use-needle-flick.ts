import { useCallback, useRef } from "react"

/**
 * The needle gets knocked back each time a slice edge passes under it.
 * Attach `needleRef` to the element that should swing, and call `flick()`.
 */
export function useNeedleFlick() {
  const needleRef = useRef<HTMLDivElement>(null)

  const flick = useCallback(() => {
    needleRef.current?.animate(
      [{ transform: "rotate(-22deg)" }, { transform: "rotate(0deg)" }],
      { duration: 140, easing: "ease-out" }
    )
  }, [])

  return { needleRef, flick }
}
