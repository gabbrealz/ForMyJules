import { useEffect, useRef, useState } from "react"
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react"
import { ArrowDownAZ, Plus, Shuffle, Trash2, Trophy, X } from "lucide-react"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { Card, CardContent, CardHeader } from "#components/ui/card"
import { Input } from "#components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs"
import type { SpinRecord } from "../types"

interface EntryRow {
  /** Stable identity, so a row keeps its input (and focus) as others come and go. */
  id: number
  value: string
}

let nextRowId = 0
const makeRow = (value: string): EntryRow => ({ id: nextRowId++, value })
const toRows = (text: string) => text.split("\n").map((line) => makeRow(line))
const toText = (rows: EntryRow[]) => rows.map((row) => row.value).join("\n")
const isBlank = (row: EntryRow) => row.value.trim() === ""

interface EntriesCardProps {
  /** One entry per line; each line is edited in its own input. */
  text: string
  onTextChange: (text: string) => void
  entryCount: number
  onShuffle: () => void
  onSort: () => void
  results: SpinRecord[]
  onClearResults: () => void
  /** Locks editing while the wheel is turning. */
  disabled?: boolean
}

export function EntriesCard({
  text,
  onTextChange,
  entryCount,
  onShuffle,
  onSort,
  results,
  onClearResults,
  disabled = false,
}: EntriesCardProps) {
  // Each line of `text` is one entry with its own input. The rows live in local
  // state (with ids) and are mirrored out through `onTextChange`.
  const [rows, setRows] = useState(() => toRows(text))
  const [syncedText, setSyncedText] = useState(text)
  // Pick up changes made from outside, e.g. Shuffle, Sort or removing a winner.
  if (text !== syncedText) {
    setSyncedText(text)
    setRows(toRows(text))
  }

  const inputRefs = useRef(new Map<number, HTMLInputElement>())
  // Row to focus once the next render has created it.
  const pendingFocus = useRef<{ id: number; caret?: number } | null>(null)

  const focusRow = (id: number, caret?: number) => {
    const input = inputRefs.current.get(id)
    if (!input) return
    input.focus()
    const position = caret ?? input.value.length
    input.setSelectionRange(position, position)
  }

  useEffect(() => {
    const pending = pendingFocus.current
    if (!pending) return
    pendingFocus.current = null
    focusRow(pending.id, pending.caret)
  })

  const commit = (next: EntryRow[]) => {
    const nextText = toText(next)
    setRows(next)
    setSyncedText(nextText)
    onTextChange(nextText)
  }

  const updateRow = (id: number, value: string) =>
    commit(rows.map((row) => (row.id === id ? { ...row, value } : row)))

  const insertAfter = (index: number) => {
    const row = makeRow("")
    pendingFocus.current = { id: row.id }
    commit([...rows.slice(0, index + 1), row, ...rows.slice(index + 1)])
  }

  const addRow = () => {
    const last = rows[rows.length - 1]
    // Already ending in an empty row: just go there instead of stacking blanks.
    if (last && isBlank(last)) {
      focusRow(last.id)
      return
    }
    insertAfter(rows.length - 1)
  }

  const removeRow = (id: number, viaKeyboard: boolean) => {
    const index = rows.findIndex((row) => row.id === id)
    const next = rows.filter((row) => row.id !== id)
    if (next.length === 0) next.push(makeRow("")) // always keep one input
    // The focused button disappears with its row, which would drop keyboard
    // focus on the page, so hand it to a neighbouring row. (Skipped for
    // mouse/touch so a tap doesn't pop up the on-screen keyboard.)
    const neighbour = next[Math.min(index, next.length - 1)]
    if (viaKeyboard && neighbour) pendingFocus.current = { id: neighbour.id }
    commit(next)
  }

  // Leaving an empty entry deletes it. The only remaining row stays, so there
  // is always an input to type in.
  const removeIfBlank = (id: number) => {
    const row = rows.find((candidate) => candidate.id === id)
    if (!row || !isBlank(row) || rows.length === 1) return
    commit(rows.filter((candidate) => candidate.id !== id))
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.nativeEvent.isComposing) return // Enter confirms an IME candidate
    if (event.key === "Enter") {
      event.preventDefault()
      insertAfter(index)
    } else if (
      event.key === "Backspace" &&
      !event.repeat && // holding the key shouldn't chew through whole entries
      event.currentTarget.value === ""
    ) {
      const previous = rows[index - 1]
      if (!previous) return // first row: nothing to go back to
      event.preventDefault()
      focusRow(previous.id) // leaving the empty row deletes it
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const target = rows[index + (event.key === "ArrowUp" ? -1 : 1)]
      if (!target) return // first/last row: keep the default caret movement
      event.preventDefault()
      focusRow(target.id)
    }
  }

  // Inputs drop line breaks on paste, so a multi-line paste is split into rows.
  const handlePaste = (
    event: ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    const current = rows[index]
    const pasted = event.clipboardData.getData("text")
    if (!current || !/\r?\n/.test(pasted)) return // single line: default paste
    event.preventDefault()

    const input = event.currentTarget
    const before = input.value.slice(0, input.selectionStart ?? input.value.length)
    const after = input.value.slice(input.selectionEnd ?? input.value.length)
    const pastedLines = pasted.split(/\r?\n/)
    const tail = pastedLines.pop() ?? ""
    const [head = "", ...middle] = pastedLines
    const last = makeRow(tail + after)
    const replacement = [
      { ...current, value: before + head },
      ...middle.map((line) => makeRow(line)),
      last,
    ]

    pendingFocus.current = { id: last.id, caret: tail.length } // after the paste
    commit([...rows.slice(0, index), ...replacement, ...rows.slice(index + 1)])
  }

  const nothingToDelete = rows.length === 1 && rows[0]?.value === ""

  return (
    <Card className="flex h-full min-h-[30rem] flex-col">
      <Tabs defaultValue="entries" className="flex min-h-0 flex-1 flex-col gap-4">
        <CardHeader>
          <TabsList className="w-full">
            <TabsTrigger value="entries" className="flex-1 gap-2">
              Entries
              <Badge variant="secondary">{entryCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex-1 gap-2">
              Results
              <Badge variant="secondary">{results.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col">
          <TabsContent value="entries" className="min-h-0 flex-1">
            <div className="flex h-full min-h-64 flex-col gap-3">
              <div className="flex gap-2 justify-between">
                <Button
                  type="button"
                  size="sm"
                  onClick={addRow}
                  disabled={disabled}
                >
                  <Plus />
                  Add entry
                </Button>
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
              </div>

              {/* The list is absolutely positioned inside a flexible box so that
                  adding entries scrolls it instead of stretching the card. The
                  padding keeps the inputs' focus rings from being clipped. */}
              <div className="relative -mx-1 min-h-48 flex-1">
                <ul
                  aria-label="Entries"
                  className="absolute inset-0 space-y-3 overflow-y-auto p-1 pr-2"
                >
                  {rows.map((row, index) => (
                    <li
                      key={row.id}
                      onBlur={(event) => {
                        // Only when focus leaves the whole row, so tabbing from
                        // the input to its delete button doesn't remove it.
                        const next = event.relatedTarget as Node | null
                        if (!event.currentTarget.contains(next)) {
                          removeIfBlank(row.id)
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Input
                        ref={(node) => {
                          if (node) {
                            inputRefs.current.set(row.id, node)
                          } else {
                            inputRefs.current.delete(row.id)
                          }
                        }}
                        aria-label={`Entry ${index + 1}`}
                        placeholder="Add an entry"
                        value={row.value}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          updateRow(row.id, event.target.value)
                        }
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        onPaste={(event) => handlePaste(event, index)}
                        disabled={disabled}
                        spellCheck={false}
                        autoComplete="off"
                        enterKeyHint="next"
                        className="bg-cream min-w-0 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete entry ${index + 1}`}
                        onClick={(event) =>
                          removeRow(row.id, event.detail === 0)
                        }
                        disabled={disabled || nothingToDelete}
                        className="shrink-0 text-muted-foreground"
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="min-h-0 flex-1">
            {results.length === 0 ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                <Trophy className="size-5" />
                Winners will show up here after each spin.
              </div>
            ) : (
              <div className="flex h-full min-h-64 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Most recent first
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClearResults}
                  >
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
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
