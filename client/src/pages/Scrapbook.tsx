import { useCallback, useEffect, useRef, useState } from "react"
import HTMLFlipBook from "react-pageflip"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { PageContent, Sheet, PAGES } from "#features/scrapbook"
import { Button } from "#components/ui/button"

// Just the bit of react-pageflip's imperative API we use.
type FlipBookHandle = {
  pageFlip: () =>
    | { flipPrev: () => void; flipNext: () => void }
    | undefined
}

// Pages keep a 400x540 ratio. "stretch" sizes the book to its container, between
// the min/max limits, and drops to a single page when the container is narrow.
const FLIPBOOK_PROPS = {
  width: 400,
  height: 540,
  size: "stretch" as const,
  minWidth: 260,
  maxWidth: 520,
  minHeight: 351,
  maxHeight: 702,
  showCover: true,
  usePortrait: true,
  drawShadow: true,
  maxShadowOpacity: 0.45,
  flippingTime: 900,
  startPage: 0,
  startZIndex: 0,
  autoSize: true,
  mobileScrollSupport: true,
  clickEventForward: true,
  useMouseEvents: true,
  swipeDistance: 30,
  showPageCorners: true,
  disableFlipByClick: false,
  className: "",
  style: {},
}

// react-pageflip re-initialises the book whenever its `children` identity changes,
// so build the sheets once, outside the component, instead of on every render.
const SHEETS = PAGES.map((page, index) => (
  <Sheet
    key={index}
    index={index}
    hard={page.kind === "cover" || page.kind === "back"}
  >
    <PageContent page={page} />
  </Sheet>
))

export default function Scrapbook() {
  const bookRef = useRef<FlipBookHandle>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [pageIndex, setPageIndex] = useState(0)

  const atStart = pageIndex <= 0
  const atEnd = pageIndex >= PAGES.length - 1

  const handleFlip = useCallback((e: { data: unknown }) => {
    if (typeof e.data === "number") setPageIndex(e.data)
  }, [])

  // react-pageflip only measures itself on window resize, but the sidebar in
  // Layout can be dragged, which changes the available width without one.
  // Nudge the book whenever the stage width changes.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let lastWidth = Math.round(stage.clientWidth)
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = Math.round(entry.contentRect.width)
      if (width === lastWidth) return
      lastWidth = width
      window.dispatchEvent(new Event("resize"))
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex w-full flex-col md:h-svh md:overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 md:p-8">
        <header className="mb-6 space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Scrapbook
          </h1>
          <p className="text-sm text-muted-foreground">
            Flip through the moments we&rsquo;ve kept.
          </p>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {/* The width cap keeps a full spread (2 pages at 400:540) inside the viewport height. */}
          <div
            ref={stageRef}
            role="group"
            aria-label="Scrapbook pages"
            className="w-full max-w-[calc((100svh_-_13rem)*1.48)] rounded-3xl bg-accent/60 p-3 sm:p-5"
          >
            <HTMLFlipBook
              ref={bookRef}
              {...FLIPBOOK_PROPS}
              onFlip={handleFlip}
            >
              {SHEETS}
            </HTMLFlipBook>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-11 rounded-full px-5"
              disabled={atStart}
              onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <Button
              size="lg"
              className="h-11 rounded-full px-5"
              disabled={atEnd}
              onClick={() => bookRef.current?.pageFlip()?.flipNext()}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
