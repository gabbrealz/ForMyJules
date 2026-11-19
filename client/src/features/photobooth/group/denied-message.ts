import type { BoothDeniedReason } from "../session/types"

const MESSAGES: Partial<Record<BoothDeniedReason, string>> = {
  not_leader: "Only the leader can do that.",
  no_layout: "Choose a layout first.",
  not_ready: "Everyone needs their camera open and ready first.",
  too_few: "You need at least 2 people.",
  locked: "That can't be changed while photos are being taken.",
  bad_step: "That isn't possible at this step.",
  no_round: "There's no round in progress.",
  cannot_save: "Guest accounts can't save to the gallery.",
  busy: "Someone else is already saving this.",
  already_saved: "This photo was already saved.",
  not_member: "You're no longer in the photobooth.",
}

/**
 * Turns a refusal into a sentence, but only when it was a refusal of one of `requests`: a stale
 * refusal from another screen must not show up here. Null when there is nothing to say.
 */
export function describeDenied(
  denied: { for: string; reason: BoothDeniedReason } | null,
  requests: readonly string[],
): string | null {
  if (!denied || !requests.includes(denied.for)) return null
  return MESSAGES[denied.reason] ?? "That didn't work. Please try again."
}
