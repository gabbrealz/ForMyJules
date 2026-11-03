import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent } from "react"
import HTMLFlipBook from "react-pageflip"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { usePageTitle } from "#hooks/use-page-title"

import { PageContent, Sheet, PAGES } from "#features/scrapbook"
import { Button } from "#components/ui/button"

type Orientation = "portrait" | "landscape"
// Where the book rests: closed on the front cover, open on a spread, or closed on the back cover.
type Stance = "front" | "open" | "back"
type Direction = 1 | -1

// Just the bit of react-pageflip's imperative API we use.
type FlipBookHandle = {
  pageFlip: () =>
    | {
        flipPrev: () => void
        flipNext: () => void
        getOrientation: () => string
        getCurrentPageIndex: () => number
      }
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

// A spread is two pages wide, so this is the widest the book box can get.
const BOOK_MAX_WIDTH = FLIPBOOK_PROPS.maxWidth * 2

const LAST_PAGE = PAGES.length - 1

// react-pageflip always lays out a full two-page box. A closed book only fills one
// half of it (the front cover sits in the right half, the back cover in the left),
// so slide the box by a quarter of its width to put the cover in the middle.
const STANCE_SHIFT: Record<Stance, number> = { front: -25, open: 0, back: 25 }

function stanceAt(index: number): Stance {
  if (index <= 0) return "front"
  if (index >= LAST_PAGE) return "back"
  return "open"
}

// Landscape page indexes are: 0 (cover), 1, 3, 5 ... (left page of each spread), then the back cover.
function indexAfterFlip(index: number, direction: Direction): number {
  if (direction > 0) return index === 0 ? 1 : index + 2
  return index - 2
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
  usePageTitle("Scrapbook")

  const bookRef = useRef<FlipBookHandle>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const shiftRef = useRef<HTMLDivElement>(null)
  const pageIndexRef = useRef(0)
  // Which way the next flip is going. Set by the buttons and by pointer input, and
  // read when the flip starts so the book can start sliding together with it.
  const intentRef = useRef<Direction>(1)
  const pointerStartXRef = useRef<number | null>(null)

  const [pageIndex, setPageIndex] = useState(0)
  const [stance, setStance] = useState<Stance>("front")
  const [orientation, setOrientation] = useState<Orientation>("landscape")

  const atStart = pageIndex <= 0
  const atEnd = pageIndex >= PAGES.length - 1

  // react-pageflip registers its event handlers once, so these must not close over
  // state: they read from refs and only call state setters.
  const handleFlip = useCallback((e: { data: unknown }) => {
    if (typeof e.data !== "number") return
    pageIndexRef.current = e.data
    setPageIndex(e.data)
    setStance(stanceAt(e.data))
  }, [])

  const handleChangeState = useCallback((e: { data: unknown }) => {
    if (e.data === "flipping") {
      // A flip just started: head for where it will land, so the book re-centers
      // while the page turns instead of after it.
      const target = indexAfterFlip(pageIndexRef.current, intentRef.current)
      setStance(stanceAt(target))
    } else if (e.data === "read") {
      // The flip is over. This also undoes the move if a drag was released
      // without turning the page.
      const index = bookRef.current?.pageFlip()?.getCurrentPageIndex()
      if (typeof index === "number") setStance(stanceAt(index))
    }
  }, [])

  const syncOrientation = useCallback(() => {
    const value = bookRef.current?.pageFlip()?.getOrientation()
    if (value === "portrait" || value === "landscape") setOrientation(value)
  }, [])

  const flip = (direction: Direction) => {
    intentRef.current = direction
    const book = bookRef.current?.pageFlip()
    if (direction > 0) book?.flipNext()
    else book?.flipPrev()
  }

  // Clicks and drags turn the page toward the side they start on; touch swipes
  // turn it in the swipe direction (same rules react-pageflip uses).
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = e.clientX
    const rect = shiftRef.current?.getBoundingClientRect()
    if (rect) intentRef.current = e.clientX < rect.left + rect.width / 2 ? -1 : 1
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const startX = pointerStartXRef.current
    pointerStartXRef.current = null
    if (startX === null || e.pointerType !== "touch") return
    const dx = e.clientX - startX
    if (Math.abs(dx) > FLIPBOOK_PROPS.swipeDistance) {
      intentRef.current = dx > 0 ? -1 : 1
    }
  }

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

  // A single page (portrait) is already centered, so only spreads get shifted.
  const shift = orientation === "landscape" ? STANCE_SHIFT[stance] : 0

  return (
    // The flipping pages and the half-empty box of a closed book can poke out past
    // the page edge. overflow-x-hidden here (not on the stage) keeps that from ever
    // producing a horizontal scrollbar without clipping anything near the book.
    // Vertically, the stage clips (see below) so flip shadows can't toggle the
    // scrollbar, and the stable gutter means a real scrollbar can't resize the layout.
    <div className="flex w-full flex-col overflow-x-hidden md:h-svh md:overflow-y-auto md:[scrollbar-gutter:stable]">
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
          {/*
            The book slides a quarter of its width to either side when a cover is
            closed, so the stage is 1.5x the book's width: the book takes the middle
            two thirds and a quarter-book of room is left on each side for the
            sliding half. The max-width is the old one (a full spread fits the
            viewport height) scaled by 1.5 so the book itself keeps the same size:
            1.5 * (cap - 2 * pad) + 2 * pad = 1.5 * cap - pad.
          */}
          <div
            ref={stageRef}
            role="group"
            aria-label="Scrapbook pages"
            className="relative w-full max-w-[calc(1.5*(100svh_-_10rem)*1.48_-_var(--stage-pad))] overflow-y-clip rounded-xl bg-accent/60 p-[var(--stage-pad)] [--stage-pad:0.75rem] sm:[--stage-pad:1.25rem] md:[--stage-pad:1.75rem] lg:[--stage-pad:2.25rem]"
            onPointerDownCapture={handlePointerDown}
            onPointerUpCapture={handlePointerUp}
          >
            {/* Two thirds of the stage = the book box, so the percentage shift is relative to the book. */}
            <div
              ref={shiftRef}
              className="mx-auto w-2/3 transition-transform ease-in-out motion-reduce:transition-none"
              style={{
                maxWidth: BOOK_MAX_WIDTH,
                transform: `translateX(${shift}%)`,
                transitionDuration: `${FLIPBOOK_PROPS.flippingTime}ms`,
              }}
            >
              <HTMLFlipBook
                ref={bookRef}
                {...FLIPBOOK_PROPS}
                onFlip={handleFlip}
                onChangeState={handleChangeState}
                onInit={syncOrientation}
                onChangeOrientation={syncOrientation}
              >
                {SHEETS}
              </HTMLFlipBook>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="h-11 rounded-full px-5"
              disabled={atStart}
              onClick={() => flip(-1)}
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <Button
              size="lg"
              className="h-11 rounded-full px-5"
              disabled={atEnd}
              onClick={() => flip(1)}
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
