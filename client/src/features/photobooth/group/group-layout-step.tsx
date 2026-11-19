import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { FramePreview } from "../components/frame-preview"
import { StepActions } from "../components/step-actions"
import { LAYOUTS } from "../constants"
import { useBoothSessionContext } from "../session/booth-session-context"
import { describeDenied } from "./denied-message"
import { GroupRoster } from "./group-roster"
import { WaitingForLeader } from "./waiting-for-leader"

/**
 * Step 1 of the group flow. Everyone sees the leader's choice as they make it; only the leader can
 * change it. The solo ChooseLayoutStep is untouched.
 */
export function GroupLayoutStep() {
  const { state, isLeader, denied, actions } = useBoothSessionContext()
  if (!state) return null

  const { layoutId } = state.config
  const error = describeDenied(denied, ["go", "config"])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Choose a layout</CardTitle>
        <CardDescription>
          {isLeader
            ? "The layout decides how many photos you'll take together."
            : "The leader is choosing the layout."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <GroupRoster />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {LAYOUTS.map((layout) => {
            const selected = layout.id === layoutId
            return (
              <Button
                key={layout.id}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                // Disabled, not hidden: the others still see which one is chosen.
                disabled={!isLeader}
                onClick={() => actions.setConfig({ layoutId: layout.id })}
                className="h-auto flex-col gap-2 py-4 disabled:opacity-100"
              >
                <FramePreview layout={layout} />
                <span className="font-heading text-base font-bold">
                  {layout.name}
                </span>
                <span className="text-xs font-normal opacity-80">
                  {layout.shots} {layout.shots === 1 ? "photo" : "photos"}
                </span>
              </Button>
            )
          })}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>

      <CardFooter>
        {isLeader ? (
          <StepActions onNext={() => actions.go(2)} nextDisabled={!layoutId} />
        ) : (
          <WaitingForLeader what="to pick a layout" />
        )}
      </CardFooter>
    </Card>
  )
}
