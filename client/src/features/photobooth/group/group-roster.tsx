import { CameraIcon, CameraOffIcon, CrownIcon } from "lucide-react"

import { Badge } from "#components/ui/badge"

import { useBoothSessionContext } from "../session/booth-session-context"

/**
 * Who is in the booth. With `showReady`, also whether each person's camera is open and ready,
 * which the leader needs to see before starting the countdown.
 */
export function GroupRoster({ showReady = false }: { showReady?: boolean }) {
  const { state, me } = useBoothSessionContext()
  if (!state) return null

  return (
    <ul className="flex flex-wrap gap-2">
      {state.members.map((member) => {
        const waiting = member.status === "waiting"
        return (
          <li
            key={member.id}
            className="flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-2 text-sm"
          >
            {member.id === state.leaderId && (
              <CrownIcon className="size-3.5 text-muted-foreground" />
            )}
            <span className="max-w-32 truncate font-medium">
              {member.name}
              {member.id === me && " (you)"}
            </span>
            {waiting ? (
              <Badge variant="outline">Next round</Badge>
            ) : (
              showReady &&
              (member.ready ? (
                <CameraIcon
                  className="size-4 text-primary"
                  aria-label="Camera ready"
                />
              ) : (
                <CameraOffIcon
                  className="size-4 text-muted-foreground"
                  aria-label="Camera not ready"
                />
              ))
            )}
          </li>
        )
      })}
    </ul>
  )
}
