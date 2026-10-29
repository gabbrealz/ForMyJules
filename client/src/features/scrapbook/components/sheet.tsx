import { useCallback, useRef } from "react"
import type { ReactNode, Ref } from "react"
import { cn } from "cn"

type SheetProps = {
  // react-pageflip clones each direct child and injects a ref callback so it can
  // grab the page's DOM node. In React 19 `ref` is a plain prop, so we accept it
  // here and attach it ourselves.
  ref?: Ref<HTMLDivElement>
  // Position in the book. Page 0 is the cover, odd = left page, even = right page.
  index: number
  // Hard sheets (covers) stay rigid while flipping instead of bending.
  hard?: boolean
  className?: string
  children: ReactNode
}

export function Sheet({
  ref,
  index,
  hard = false,
  className,
  children,
}: SheetProps) {
  // In dev, React 19 StrictMode calls ref callbacks twice on mount, and
  // react-pageflip would then register every page twice. Forward each
  // (callback, node) pair only once to keep the page list clean.
  const lastForwarded = useRef<{ cb: unknown; node: HTMLDivElement } | null>(
    null
  )
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || typeof ref !== "function") return
      const last = lastForwarded.current
      if (last && last.cb === ref && last.node === node) return
      lastForwarded.current = { cb: ref, node }
      ref(node)
    },
    [ref]
  )

  const isLeftPage = index % 2 === 1

  // The outer div is owned by react-pageflip (it sets its size and position),
  // so all visual styling lives on the inner div.
  return (
    <div ref={setRef} data-density={hard ? "hard" : "soft"}>
      <div
        className={cn(
          "relative size-full overflow-hidden select-none",
          !hard && "bg-cream text-brown",
          className
        )}
      >
        {children}
        {!hard && (
          // Soft shading toward the spine, so each sheet reads as a bound page.
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 w-10 from-brown/15 to-transparent",
              isLeftPage ? "right-0 bg-linear-to-l" : "left-0 bg-linear-to-r"
            )}
          />
        )}
      </div>
    </div>
  )
}
