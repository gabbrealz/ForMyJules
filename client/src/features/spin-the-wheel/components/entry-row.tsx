import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"

interface EntryRowProps {
  /** 1-based position in the list, used for the accessible names. */
  position: number
  value: string
  disabled?: boolean
  canDelete: boolean
  inputRef: (node: HTMLInputElement | null) => void
  onChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void
  /** `viaKeyboard` is true when the button was activated without a pointer. */
  onDelete: (viaKeyboard: boolean) => void
  /** Focus has left the whole row (the input and its delete button). */
  onLeave: () => void
}

/** One editable entry: an input with a delete button beside it. */
export function EntryRow({
  position,
  value,
  disabled = false,
  canDelete,
  inputRef,
  onChange,
  onKeyDown,
  onPaste,
  onDelete,
  onLeave,
}: EntryRowProps) {
  return (
    <li
      onBlur={(event) => {
        // Only when focus leaves the whole row, so tabbing from the input to
        // its delete button doesn't count as leaving.
        const next = event.relatedTarget as Node | null
        if (!event.currentTarget.contains(next)) onLeave()
      }}
      className="flex items-center gap-2"
    >
      <Input
        ref={inputRef}
        aria-label={`Entry ${position}`}
        placeholder="Add an entry"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        enterKeyHint="next"
        className="min-w-0 flex-1 bg-cream"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Delete entry ${position}`}
        onClick={(event) => onDelete(event.detail === 0)}
        disabled={disabled || !canDelete}
        className="shrink-0 text-muted-foreground"
      >
        <X />
      </Button>
    </li>
  )
}
