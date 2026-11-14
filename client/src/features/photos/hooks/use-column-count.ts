import { useCallback, useState } from "react"
import { MIN_COLUMNS, columnsForWidth } from "../utils.ts"

/**
 * How many masonry columns fit the element the returned ref is attached to. It
 * measures the element itself rather than the window, so the sidebar opening or
 * closing changes the count too.
 */
export function useColumnCount() {
  const [count, setCount] = useState(MIN_COLUMNS)

  // A callback ref measures during the commit, before the browser paints, so the
  // first frame already has the right number of columns.
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) return
    const update = () => setCount(columnsForWidth(element.clientWidth))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, count] as const
}
