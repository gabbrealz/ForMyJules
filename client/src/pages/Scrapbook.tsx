import { useCallback, useEffect, useRef, useState } from "react"
import type { CSSProperties, PointerEvent } from "react"
import HTMLFlipBook from "react-pageflip"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

import { usePageTitle } from "#hooks/use-page-title"
import { useIsMobile } from "#hooks/use-mobile"

import { PageShell } from "#layouts/page-shell"
import {
  MOCK_LAST_UPDATED,
  PageContent,
  PAGES,
  ScrapbookToolbar,
  Sheet,
} from "#features/scrapbook"
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

// Pages keep a 400x540 ratio.
const PAGE_WIDTH = 400
const PAGE_HEIGHT = 540
// In the normal view a page is never wider than this.
const NORMAL_MAX_PAGE_WIDTH = 520
// Full screen has no such cap. react-pageflip reads its size limits once, when
// it mounts, so they can't change when full screen is toggled. Its ceilings are
// therefore set high enough for full screen, and the normal view's cap is
// applied in CSS instead (BOOK_MAX_WIDTH, on the element around the book).
const MAX_PAGE_WIDTH = 1600

// "stretch" sizes the book to its container, between the min/max limits, and
// drops to a single page when the container is narrow.
const FLIPBOOK_PROPS = {
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
  size: "stretch" as const,
  minWidth: 260,
  maxWidth: MAX_PAGE_WIDTH,
  minHeight: 351,
  maxHeight: Math.round((MAX_PAGE_WIDTH * PAGE_HEIGHT) / PAGE_WIDTH),
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

// A spread is two pages wide, so this is the widest the book box gets in the normal view.
const BOOK_MAX_WIDTH = NORMAL_MAX_PAGE_WIDTH * 2

/*
  How wide the stage (the notebook wrapper) may get, so the book fits the
  viewport height. A spread is 800x540, so book height = book width / 1.48. The
  stage is 1.5x the book plus its padding (see below), hence the 1.5 and the
  padding terms.

  Both formulas subtract whatever else shares the column with the book:
    - the page's own padding: 4rem (md:p-8 top and bottom)
    - the toolbar row and its gap: 3rem
    - the Previous / Next row and its gap: 4.25rem
  Normal view also has the page header (title + subtitle), which this has
  always only roughly budgeted for, so it keeps the old 10rem + the 3rem for the
  toolbar. Full screen on desktop has no page header, so it can be exact: the
  stage's whole height (book + padding) is what's left, with 0.25rem of slack
  so rounding can't make the page scroll by a pixel.
*/
const NORMAL_MAX_STAGE_WIDTH =
  "max-w-[calc(1.5*(100svh_-_var(--header-height)_-_13rem)*1.48_-_var(--stage-pad))]"
const FULL_SCREEN_MAX_STAGE_WIDTH =
  "max-w-[calc(1.5*(100svh_-_var(--header-height)_-_11.5rem_-_2*var(--stage-pad))*1.48_+_2*var(--stage-pad))]"

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

  const isMobile = useIsMobile()
  const [isFullScreen, setIsFullScreen] = useState(false)
  // Full screen means two different things:
  // - mobile: the book fills the stage (no stage padding, no room reserved for sliding).
  // - desktop: the page header goes away and the stage grows to the height that's left.
  const fullScreenMobile = isFullScreen && isMobile
  const fullScreenDesktop = isFullScreen && !isMobile

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
  // Layout can be dragged or collapsed, which changes the available width
  // without one. Nudge the book whenever the stage width changes.
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

  // Toggling full screen resizes the book (and crossing the mobile breakpoint
  // can too). The observer above usually catches that, but not when the stage's
  // width happens to stay the same, so nudge the book explicitly as well.
  useEffect(() => {
    window.dispatchEvent(new Event("resize"))
  }, [isFullScreen, isMobile])

  // Escape leaves full screen.
  useEffect(() => {
    if (!isFullScreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullScreen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullScreen])

  // A single page (portrait) is already centered, so only spreads get shifted.
  const shift = orientation === "landscape" ? STANCE_SHIFT[stance] : 0

  return (
    // fitViewport makes PageShell this page's own scroll container (md+): it fills
    // the space below the header, has overflow-x-hidden and a stable scrollbar gutter.
    // The flipping pages and the half-empty box of a closed book can poke out past
    // the page edge. overflow-x-hidden there (not on the stage) keeps that from ever
    // producing a horizontal scrollbar without clipping anything near the book.
    // Vertically, the stage clips (see below) so flip shadows can't toggle the
    // scrollbar, and the stable gutter means a real scrollbar can't resize the layout.
    //
    // Desktop full screen drops the title (so no page header) and the container's
    // max width, so the stage can use all the room the sidebar leaves.
    <PageShell
      fitViewport
      title={fullScreenDesktop ? undefined : "Scrapbook"}
      subtitle="Flip through the moments we've kept."
      className={fullScreenDesktop ? "max-w-none" : undefined}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {/*
          The toolbar and the stage share this column, so the toolbar lines up
          with the stage's left and right edges. The column carries the stage's
          max width and padding variable.

          The book slides a quarter of its width to either side when a cover is
          closed, so the stage is 1.5x the book's width: the book takes the middle
          two thirds and a quarter-book of room is left on each side for the
          sliding half.
        */}
        <div
          className={cn(
            "mx-auto flex w-full flex-col gap-3 [--stage-pad:0.75rem] sm:[--stage-pad:1.25rem] md:[--stage-pad:1.75rem] lg:[--stage-pad:2.25rem]",
            fullScreenMobile
              ? "max-w-none"
              : fullScreenDesktop
                ? FULL_SCREEN_MAX_STAGE_WIDTH
                : NORMAL_MAX_STAGE_WIDTH,
          )}
          // Mobile full screen: no padding, so the book fills the stage edge to edge.
          style={
            fullScreenMobile
              ? ({ "--stage-pad": "0px" } as CSSProperties)
              : undefined
          }
        >
          <ScrapbookToolbar
            lastUpdated={MOCK_LAST_UPDATED}
            isFullScreen={isFullScreen}
            onToggleFullScreen={() => setIsFullScreen((on) => !on)}
          />

          <div
            ref={stageRef}
            role="group"
            aria-label="Scrapbook pages"
            className="relative w-full overflow-y-clip rounded-xl bg-accent/60 p-[var(--stage-pad)]"
            onPointerDownCapture={handlePointerDown}
            onPointerUpCapture={handlePointerUp}
          >
            {/* Two thirds of the stage = the book box, so the percentage shift is relative to the book.
                Mobile full screen uses the whole stage; the book is a single page there. */}
            <div
              ref={shiftRef}
              className={cn(
                "mx-auto transition-transform ease-in-out motion-reduce:transition-none",
                fullScreenMobile ? "w-full" : "w-2/3",
              )}
              style={{
                maxWidth: isFullScreen ? undefined : BOOK_MAX_WIDTH,
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
    </PageShell>
  )
}
