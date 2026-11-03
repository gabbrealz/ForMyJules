import { useState } from "react"
import type { ClipboardEvent, KeyboardEvent } from "react"
import {
  createRow,
  deleteRow,
  hasLineBreak,
  insertRowAfter,
  isBlank,
  pasteLines,
  rowsFromText,
  rowsToText,
  setRowValue,
} from "../services/entry-rows"
import type { EntryRow } from "../services/entry-rows"
import { useRowFocus } from "./use-row-focus"

/**
 * State and behaviour of the editable entry list. The rows are mirrored out
 * through `onTextChange` as one entry per line, and rebuilt whenever `text`
 * is changed from outside (Shuffle, Sort, removing a winner).
 */
export function useEntryRows(
  text: string,
  onTextChange: (text: string) => void
) {
  const [rows, setRows] = useState(() => rowsFromText(text))
  const [syncedText, setSyncedText] = useState(text)
  if (text !== syncedText) {
    setSyncedText(text)
    setRows(rowsFromText(text))
  }

  const { registerInput, focusRow, focusRowAfterRender } = useRowFocus()

  const commit = (next: EntryRow[]) => {
    const nextText = rowsToText(next)
    setRows(next)
    setSyncedText(nextText)
    onTextChange(nextText)
  }

  const indexOf = (id: number) => rows.findIndex((row) => row.id === id)

  const updateRow = (id: number, value: string) =>
    commit(setRowValue(rows, id, value))

  const insertAfter = (index: number) => {
    const row = createRow()
    focusRowAfterRender(row.id)
    commit(insertRowAfter(rows, index, row))
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
    const index = indexOf(id)
    const next = deleteRow(rows, id)
    // The focused button disappears with its row, which would drop keyboard
    // focus on the page, so hand it to a neighbouring row. (Skipped for
    // mouse/touch so a tap doesn't pop up the on-screen keyboard.)
    const neighbour = next[Math.min(index, next.length - 1)]
    if (viaKeyboard && neighbour) focusRowAfterRender(neighbour.id)
    commit(next)
  }

  // Leaving an empty entry deletes it. The only remaining row stays, so there
  // is always an input to type in.
  const removeRowIfBlank = (id: number) => {
    const row = rows[indexOf(id)]
    if (!row || !isBlank(row) || rows.length === 1) return
    commit(deleteRow(rows, id))
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    id: number
  ) => {
    if (event.nativeEvent.isComposing) return // Enter confirms an IME candidate
    const index = indexOf(id)
    if (index < 0) return

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
    id: number
  ) => {
    const pasted = event.clipboardData.getData("text")
    if (!hasLineBreak(pasted)) return // single line: let the input handle it

    const input = event.currentTarget
    const before = input.value.slice(
      0,
      input.selectionStart ?? input.value.length
    )
    const after = input.value.slice(input.selectionEnd ?? input.value.length)
    const result = pasteLines(rows, indexOf(id), pasted, before, after)
    if (!result) return

    event.preventDefault()
    focusRowAfterRender(result.last.id, result.caret)
    commit(result.rows)
  }

  return {
    rows,
    /** False only when the single remaining row is already empty. */
    canDelete: rows.length > 1 || rows[0]?.value !== "",
    registerInput,
    addRow,
    updateRow,
    removeRow,
    removeRowIfBlank,
    handleKeyDown,
    handlePaste,
  }
}
