/**
 * Pure logic for the editable entry list. The entries text holds one entry per
 * line; in the UI each line is a row with its own input.
 */

export interface EntryRow {
  /** Stable identity, so a row keeps its input (and focus) as others come and go. */
  id: number
  value: string
}

let nextRowId = 0

export function createRow(value = ""): EntryRow {
  return { id: nextRowId++, value }
}

export const rowsFromText = (text: string): EntryRow[] =>
  text.split("\n").map((line) => createRow(line))

export const rowsToText = (rows: readonly EntryRow[]): string =>
  rows.map((row) => row.value).join("\n")

export const isBlank = (row: EntryRow): boolean => row.value.trim() === ""

export const setRowValue = (
  rows: readonly EntryRow[],
  id: number,
  value: string
): EntryRow[] => rows.map((row) => (row.id === id ? { ...row, value } : row))

export const insertRowAfter = (
  rows: readonly EntryRow[],
  index: number,
  row: EntryRow
): EntryRow[] => [...rows.slice(0, index + 1), row, ...rows.slice(index + 1)]

/** Removes a row. The list never goes empty: the last row becomes a blank one. */
export function deleteRow(rows: readonly EntryRow[], id: number): EntryRow[] {
  const next = rows.filter((row) => row.id !== id)
  return next.length > 0 ? next : [createRow()]
}

export const hasLineBreak = (text: string): boolean => /\r?\n/.test(text)

export interface PasteResult {
  rows: EntryRow[]
  /** The row holding the end of the pasted text. */
  last: EntryRow
  /** Caret position in `last`: right after the pasted text. */
  caret: number
}

/**
 * Splices multi-line pasted text into the row at `index`, one line per row.
 * `before` and `after` are the row's text either side of the selection that the
 * paste replaces.
 */
export function pasteLines(
  rows: readonly EntryRow[],
  index: number,
  pasted: string,
  before: string,
  after: string
): PasteResult | null {
  const current = rows[index]
  if (!current) return null

  const lines = pasted.split(/\r?\n/)
  const tail = lines.pop() ?? ""
  const [head = "", ...middle] = lines
  const last = createRow(tail + after)
  const replacement = [
    { ...current, value: before + head },
    ...middle.map((line) => createRow(line)),
    last,
  ]

  return {
    rows: [...rows.slice(0, index), ...replacement, ...rows.slice(index + 1)],
    last,
    caret: tail.length,
  }
}
