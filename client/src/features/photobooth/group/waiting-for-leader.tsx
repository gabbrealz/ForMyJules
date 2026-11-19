import { Spinner } from "#components/ui/spinner"

import { useBoothSessionContext } from "../session/booth-session-context"

/** Shown in place of the leader's buttons, so everyone else knows who is driving. */
export function WaitingForLeader({ what = "to continue" }: { what?: string }) {
  const { state } = useBoothSessionContext()
  const leader = state?.members.find((member) => member.id === state.leaderId)

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner className="size-4" /> Waiting for {leader?.name ?? "the leader"}{" "}
      {what}
    </p>
  )
}
