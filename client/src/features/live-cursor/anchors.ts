/** Attribute the cursor system looks for. */
export const ANCHOR_ATTRIBUTE = "data-anchor"

/**
 * Every region cursors can be pinned to. A remote cursor is drawn at the same
 * spot *within* the same region, so it points at the same content on any screen.
 *
 * Names must be stable and unique, and match ANCHOR_NAME_PATTERN. Tag whole
 * sections or image blocks, not tiny elements; untagged areas fall back to
 * page-level coordinates.
 */
export const ANCHORS = {
  spinWheel: "spin-wheel",
  spinEntries: "spin-entries",
} as const

export type AnchorName = (typeof ANCHORS)[keyof typeof ANCHORS]

/** Spread onto the element that should be an anchor: <section {...anchorProps(ANCHORS.spinWheel)}>. */
export function anchorProps(name: AnchorName) {
  return { [ANCHOR_ATTRIBUTE]: name }
}
