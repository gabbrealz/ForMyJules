import { MaximizeIcon, MinimizeIcon, PencilIcon } from "lucide-react"

import { Button } from "#components/ui/button"

type ScrapbookToolbarProps = {
  lastUpdated: Date
  isFullScreen: boolean
  onToggleFullScreen: () => void
  onEdit?: () => void
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

/**
 * The row above the notebook wrapper: when the scrapbook was last changed on
 * the left, its actions on the right. Fixed at 2.25rem tall (one row) because
 * the full-screen sizing in pages/Scrapbook.tsx budgets for exactly that.
 */
export function ScrapbookToolbar({
  lastUpdated,
  isFullScreen,
  onToggleFullScreen,
  onEdit,
}: ScrapbookToolbarProps) {
  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="text-sm text-muted-foreground">
        Last Updated:{" "}
        <time
          dateTime={lastUpdated.toISOString()}
          className="font-medium text-foreground"
        >
          {DATE_FORMAT.format(lastUpdated)}
        </time>
      </p>

      {/* ml-auto keeps the buttons on the right even when they wrap below the label on narrow screens. */}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToggleFullScreen}>
          {isFullScreen ? <MinimizeIcon /> : <MaximizeIcon />}
          {isFullScreen ? "Exit Full Screen" : "Full Screen"}
        </Button>
        <Button size="sm" onClick={onEdit}>
          <PencilIcon />
          Edit Scrapbook
        </Button>
      </div>
    </div>
  )
}
