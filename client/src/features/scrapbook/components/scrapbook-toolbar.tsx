import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinimizeIcon,
  PencilIcon,
} from "lucide-react"

import { Button } from "#components/ui/button"

type ScrapbookToolbarProps = {
  lastUpdated: Date
  isFullScreen: boolean
  onToggleFullScreen: () => void
  onEdit?: () => void
  canGoPrevious: boolean
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

/**
 * The row above the notebook wrapper: when the scrapbook was last changed on
 * the left, the page-turning buttons in the middle (centered over the book),
 * and the actions on the right. One row, 2.25rem tall, on md+; on narrow
 * screens the label and page buttons share the first row and the actions
 * drop to a second one.
 */
export function ScrapbookToolbar({
  lastUpdated,
  isFullScreen,
  onToggleFullScreen,
  onEdit,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: ScrapbookToolbarProps) {
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2 md:grid md:grid-cols-[1fr_auto_1fr]">
      <p className="mr-auto text-sm text-muted-foreground md:mr-0">
        Last Updated:{" "}
        <time
          dateTime={lastUpdated.toISOString()}
          className="font-medium text-foreground"
        >
          {DATE_FORMAT.format(lastUpdated)}
        </time>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Previous page"
          disabled={!canGoPrevious}
          onClick={onPrevious}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Next page"
          disabled={!canGoNext}
          onClick={onNext}
        >
          <ChevronRightIcon />
        </Button>
      </div>

      <div className="flex w-full items-center justify-end gap-2 md:w-auto">
        <Button variant="outline" size="sm" onClick={onToggleFullScreen}>
          {isFullScreen ? <MinimizeIcon /> : <MaximizeIcon />}
          {isFullScreen ? "Zoom out" : "Zoom in"}
        </Button>
        <Button size="sm" onClick={onEdit}>
          <PencilIcon />
          Edit Scrapbook
        </Button>
      </div>
    </div>
  )
}
