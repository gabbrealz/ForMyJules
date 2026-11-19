import { ArrowLeftIcon, CrownIcon, PlayIcon, UsersIcon } from "lucide-react"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Spinner } from "#components/ui/spinner"

import { useBoothSessionContext } from "../session/booth-session-context"
import { BOOTH_MAX_MEMBERS, BOOTH_MIN_MEMBERS } from "../session/constants"
import type { BoothDeniedReason } from "../session/types"
import { STEP_BUTTON_CLASS } from "./step-actions"

const BEGIN_DENIED: Partial<Record<BoothDeniedReason, string>> = {
  too_few: `You need at least ${BOOTH_MIN_MEMBERS} people to start.`,
  not_leader: "Only the leader can start.",
}

type BoothLobbyProps = {
  /** Back to the mode choice. Leaves the session. */
  onExit: () => void
}

/**
 * The waiting room, shown after choosing "With others" and before the steps. Everyone sees who is
 * here; only the leader (the first person in) can start, and only with enough people.
 */
export function BoothLobby({ onExit }: BoothLobbyProps) {
  const { joinStatus, refusal, connection, state, me, isLeader, denied, actions } =
    useBoothSessionContext()

  if (joinStatus === "refused") {
    return (
      <LobbyNotice
        title={refusal === "full" ? "The photobooth is full" : "Already here"}
        description={
          refusal === "full"
            ? `Up to ${BOOTH_MAX_MEMBERS} people can take photos together. Try again when someone leaves.`
            : "You're already in the photobooth on another tab or device. Close that one first, or use it."
        }
        onExit={onExit}
      />
    )
  }

  if (joinStatus !== "joined" || !state) {
    return (
      <LobbyNotice
        title="Joining the photobooth"
        description={
          connection === "reconnecting"
            ? "The connection dropped. Reconnecting…"
            : "Connecting…"
        }
        busy
        onExit={onExit}
      />
    )
  }

  const { members, leaderId } = state
  const leader = members.find((member) => member.id === leaderId)
  const canBegin = members.length >= BOOTH_MIN_MEMBERS
  const beginError =
    denied?.for === "begin" ? (BEGIN_DENIED[denied.reason] ?? null) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Waiting room</CardTitle>
        <CardDescription>
          {isLeader
            ? `You're the leader. Start when everyone has joined (at least ${BOOTH_MIN_MEMBERS} people).`
            : `Waiting for ${leader?.name ?? "the leader"} to start.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="size-4" />
          {members.length} of {BOOTH_MAX_MEMBERS} people here
        </p>

        <ol className="grid gap-2 sm:grid-cols-2">
          {members.map((member, index) => (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {member.name}
              </span>
              {member.id === me && <Badge variant="outline">You</Badge>}
              {member.id === leaderId && (
                <Badge variant="secondary">
                  <CrownIcon /> Leader
                </Badge>
              )}
            </li>
          ))}
        </ol>

        {!canBegin && (
          <p className="text-sm text-muted-foreground">
            Waiting for someone else to join…
          </p>
        )}
        {beginError && (
          <p role="alert" className="text-sm text-destructive">
            {beginError}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className={STEP_BUTTON_CLASS}
            onClick={onExit}
          >
            <ArrowLeftIcon /> Back
          </Button>

          {isLeader ? (
            <Button
              type="button"
              className={STEP_BUTTON_CLASS}
              onClick={actions.begin}
              disabled={!canBegin}
            >
              <PlayIcon /> Start
            </Button>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" /> Waiting for the leader
            </p>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

type LobbyNoticeProps = {
  title: string
  description: string
  busy?: boolean
  onExit: () => void
}

/** A card for the cases where there is no lobby to show yet: connecting, or turned away. */
function LobbyNotice({ title, description, busy, onExit }: LobbyNoticeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {busy && (
        <CardContent>
          <Spinner className="size-6" />
        </CardContent>
      )}
      <CardFooter>
        <Button
          type="button"
          variant="outline"
          className={STEP_BUTTON_CLASS}
          onClick={onExit}
        >
          <ArrowLeftIcon /> Back
        </Button>
      </CardFooter>
    </Card>
  )
}
