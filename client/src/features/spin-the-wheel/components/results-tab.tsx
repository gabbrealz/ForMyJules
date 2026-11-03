import { Trash2, Trophy } from "lucide-react"
import { Button } from "#components/ui/button"
import type { SpinRecord } from "../types"

interface ResultsTabProps {
  results: SpinRecord[]
  onClear: () => void
}

export function ResultsTab({ results, onClear }: ResultsTabProps) {
  if (results.length === 0) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <Trophy className="size-5" />
        Winners will show up here after each spin.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-64 flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Most recent first</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <Trash2 />
          Clear
        </Button>
      </div>
      <ul className="max-h-96 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-none">
        {results.map((result) => (
          <li
            key={result.id}
            className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2"
          >
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: result.color }}
            />
            <span className="min-w-0 flex-1 truncate font-medium">
              {result.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
