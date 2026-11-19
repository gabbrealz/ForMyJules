import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Field, FieldGroup, FieldLabel } from "#components/ui/field"
import { Switch } from "#components/ui/switch"

import { CameraPreview } from "../components/camera-preview"
import { StepActions } from "../components/step-actions"
import { FILTERS, INTERVALS, getFilter } from "../constants"
import type { CameraState } from "../hooks/use-camera"
import type { RemotePreview } from "../rtc/use-peer-mesh"
import { useBoothSessionContext } from "../session/booth-session-context"
import type { BoothScene } from "../session/types"
import { describeDenied } from "./denied-message"
import { GroupRoster } from "./group-roster"
import { RemotePreviews } from "./remote-previews"
import { WaitingForLeader } from "./waiting-for-leader"

const SCENES: { id: BoothScene; name: string; hint: string }[] = [
  {
    id: "one-scene",
    name: "Together",
    hint: "Everyone is cut out and placed in one shared picture.",
  },
  {
    id: "separate-cells",
    name: "Separate",
    hint: "Each person gets their own photo cell.",
  },
]

/**
 * Step 2 of the group flow. Each person checks their own camera; the leader's choices are shown to
 * everyone as they are made, so what you see is what the group will get.
 */
export function GroupExperienceStep({
  camera,
  previews,
}: {
  camera: CameraState
  previews: ReadonlyMap<number, RemotePreview>
}) {
  const { state, isLeader, denied, actions } = useBoothSessionContext()
  if (!state) return null

  const { config } = state
  const together = config.scene === "one-scene"
  const error = describeDenied(denied, ["go", "config"])

  return (
    <Card className="@container">
      <CardHeader>
        <CardTitle className="font-heading">Configure the experience</CardTitle>
        <CardDescription>
          {isLeader
            ? "Pick a scene, a filter and how long to wait between photos."
            : "The leader is setting up the photos. Check that your camera looks right."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <GroupRoster />

        <div className="grid gap-6 @lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <CameraPreview
              camera={camera}
              filter={getFilter(config.filterId).css}
              removeBackground={config.removeBackground}
            />
            <RemotePreviews previews={previews} />
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel>Scene</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {SCENES.map((scene) => {
                  const selected = scene.id === config.scene
                  return (
                    <Button
                      key={scene.id}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      disabled={!isLeader}
                      onClick={() => actions.setConfig({ scene: scene.id })}
                      className="text-xs disabled:opacity-100 sm:text-sm"
                    >
                      {scene.name}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {SCENES.find((scene) => scene.id === config.scene)?.hint}
              </p>
            </Field>

            <Field>
              <FieldLabel>Filter</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {FILTERS.map((filter) => {
                  const selected = filter.id === config.filterId
                  return (
                    <Button
                      key={filter.id}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      disabled={!isLeader}
                      onClick={() => actions.setConfig({ filterId: filter.id })}
                      className="text-xs disabled:opacity-100 sm:text-sm"
                    >
                      {filter.name}
                    </Button>
                  )
                })}
              </div>
            </Field>

            <Field>
              <FieldLabel>Time between photos</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {INTERVALS.map((interval) => {
                  const selected = interval.id === config.intervalId
                  return (
                    <Button
                      key={interval.id}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      disabled={!isLeader}
                      onClick={() =>
                        actions.setConfig({ intervalId: interval.id })
                      }
                      className="flex-1 text-xs disabled:opacity-100 sm:text-sm"
                    >
                      {interval.seconds}s
                    </Button>
                  )
                })}
              </div>
            </Field>

            <Field>
              <div className="flex items-start justify-between gap-4">
                <FieldLabel htmlFor="group-remove-background">
                  Remove background
                </FieldLabel>
                {/* Always on in a shared scene: people are cut out to be layered together. */}
                <Switch
                  id="group-remove-background"
                  checked={config.removeBackground}
                  disabled={!isLeader || together}
                  onCheckedChange={(checked) =>
                    actions.setConfig({ removeBackground: checked })
                  }
                />
              </div>
            </Field>
          </FieldGroup>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>

      <CardFooter>
        {isLeader ? (
          <StepActions onBack={() => actions.go(1)} onNext={() => actions.go(3)} />
        ) : (
          <WaitingForLeader what="to continue" />
        )}
      </CardFooter>
    </Card>
  )
}
