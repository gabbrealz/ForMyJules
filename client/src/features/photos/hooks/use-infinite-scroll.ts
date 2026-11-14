import { useEffect, useRef } from "react"

/** Start loading when the sentinel is within two screen heights of the bottom. */
const DEFAULT_ROOT_MARGIN = "0px 0px 200% 0px"

// The nearest ancestor that really scrolls (content taller than its box), or null
// for the page itself. An IntersectionObserver with no root can't look past an
// inner scroll container, so the container has to be the root in that case.
function getScrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    const scrolls = overflowY === "auto" || overflowY === "scroll"
    if (scrolls && node.scrollHeight > node.clientHeight) return node
  }
  return null
}

/**
 * Calls `onLoadMore` whenever the returned ref's element comes near the bottom of
 * the scrolling area. Put the ref on an empty element after the list.
 *
 * `enabled` should be false while a request runs, after a failure, and when
 * there's nothing left. The observer is recreated each time it turns true, and a
 * new observer reports the current position straight away, so a page that still
 * leaves the sentinel in range triggers the next one without any scrolling.
 */
export function useInfiniteScroll<T extends HTMLElement>({
  enabled,
  onLoadMore,
  rootMargin = DEFAULT_ROOT_MARGIN,
}: {
  enabled: boolean
  onLoadMore: () => void
  rootMargin?: string
}) {
  const sentinelRef = useRef<T>(null)
  const onLoadMoreRef = useRef(onLoadMore)

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!enabled || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current()
        }
      },
      { root: getScrollParent(sentinel), rootMargin },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled, rootMargin])

  return sentinelRef
}
