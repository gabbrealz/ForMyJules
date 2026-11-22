/**
 * Where a person stands in the shared scene ("Together"), as the horizontal anchor `drawFit` and
 * `snapshotStill` take: 0 puts a picture narrower than the scene against its left edge, 1 against
 * the right edge, 0.5 in the middle.
 *
 * A portrait phone is narrower than the scene once everyone's faces are the same size. Instead of
 * leaving a strip on both sides, it is pushed against one edge, like people positioning
 * themselves for a photo: the first person to join stands at the left, the last at the right, the
 * ones between spread out in the middle. A person alone stays in the middle.
 *
 * `members` are the people in the scene, in join order (only the active ones count).
 *
 * The pictures are drawn before they are mirrored, and the mirror swaps left and right, so the
 * anchor returned is already flipped: the first person, who should appear on the left, gets 1.
 */
export function sceneAnchor(
  members: readonly { id: number; status: string }[],
  id: number | null,
): number {
  const here = members.filter((member) => member.status === "active")
  const index = here.findIndex((member) => member.id === id)
  if (here.length < 2 || index < 0) return 0.5

  const visual = index / (here.length - 1)
  return 1 - visual
}
