import { ArrowDownAZ, Plus, Shuffle } from "lucide-react"
import { Button } from "#components/ui/button"
import { useEntryRows } from "../hooks/use-entry-rows"
import { EntryRow } from "./entry-row"

interface EntriesTabProps {
  /** One entry per line; each line is edited in its own input. */
  text: string
  onTextChange: (text: string) => void
  /** Number of non-empty entries. */
  entryCount: number
  onShuffle: () => void
  onSort: () => void
  /** Locks editing while the wheel is turning. */
  disabled?: boolean
}

export function EntriesTab({
  text,
  onTextChange,
  entryCount,
  onShuffle,
  onSort,
  disabled = false,
}: EntriesTabProps) {
  const {
    rows,
    canDelete,
    registerInput,
    addRow,
    updateRow,
    removeRow,
    removeRowIfBlank,
    handleKeyDown,
    handlePaste,
  } = useEntryRows(text, onTextChange)

  return (
    <div className="flex h-full min-h-64 flex-col gap-3">
      <div className="flex gap-2 justify-between">
        <span className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onShuffle}
            disabled={disabled || entryCount < 2}
          >
            <Shuffle />
            Shuffle
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSort}
            disabled={disabled || entryCount < 2}
          >
          <ArrowDownAZ />
          Sort
        </Button>
        </span>
        <Button type="button" size="sm" onClick={addRow} disabled={disabled}>
          <Plus />
          Add entry
        </Button>
      </div>

      {/* The list is absolutely positioned inside a flexible box so that
          adding entries scrolls it instead of stretching the card. The
          padding keeps the inputs' focus rings from being clipped. */}
      <div className="relative -mx-1 min-h-48 flex-1">
        <ul
          aria-label="Entries"
          className="absolute inset-0 space-y-2 overflow-y-auto p-1 pr-2"
        >
          {rows.map((row, index) => (
            <EntryRow
              key={row.id}
              position={index + 1}
              value={row.value}
              disabled={disabled}
              canDelete={canDelete}
              inputRef={registerInput(row.id)}
              onChange={(value) => updateRow(row.id, value)}
              onKeyDown={(event) => handleKeyDown(event, row.id)}
              onPaste={(event) => handlePaste(event, row.id)}
              onDelete={(viaKeyboard) => removeRow(row.id, viaKeyboard)}
              onLeave={() => removeRowIfBlank(row.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
