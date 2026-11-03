import { useEffect, useRef } from "react"

/**
 * Keeps track of each row's input by id so focus can move between rows,
 * including to a row that doesn't exist yet (focus is applied after the next
 * render).
 */
export function useRowFocus() {
  const inputs = useRef(new Map<number, HTMLInputElement>())
  const pending = useRef<{ id: number; caret?: number } | null>(null)

  const focusRow = (id: number, caret?: number) => {
    const input = inputs.current.get(id)
    if (!input) return
    input.focus()
    const position = caret ?? input.value.length
    input.setSelectionRange(position, position)
  }

  useEffect(() => {
    const target = pending.current
    if (!target) return
    pending.current = null
    focusRow(target.id, target.caret)
  })

  return {
    /** Ref callback for a row's input: `ref={registerInput(row.id)}`. */
    registerInput: (id: number) => (node: HTMLInputElement | null) => {
      if (node) {
        inputs.current.set(id, node)
      } else {
        inputs.current.delete(id)
      }
    },
    /** Focuses a row now, with the caret at `caret` (default: the end). */
    focusRow,
    /** Focuses a row once the next render has created it. */
    focusRowAfterRender: (id: number, caret?: number) => {
      pending.current = { id, caret }
    },
  }
}
