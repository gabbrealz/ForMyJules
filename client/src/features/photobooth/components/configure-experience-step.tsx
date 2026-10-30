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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field"
import { Slider } from "#components/ui/slider"

import { FILTERS, MAX_INTERVAL, MIN_INTERVAL, getFilter } from "../constants"
import type { CameraState } from "../hooks/use-camera"
import type { Experience } from "../types"
import { CameraPreview } from "./camera-preview"
import { StepActions } from "./step-actions"

type ConfigureExperienceStepProps = {
  experience: Experience
  onChange: (next: Experience) => void
  camera: CameraState
  onBack: () => void
  onNext: () => void
}

export function ConfigureExperienceStep({
  experience,
  onChange,
  camera,
  onBack,
  onNext,
}: ConfigureExperienceStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Configure the experience</CardTitle>
        <CardDescription>
          Pick a camera filter and how long to wait between photos.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2">
        <CameraPreview
          camera={camera}
          filter={getFilter(experience.filterId).css}
        />

        <FieldGroup>
          <Field>
            <FieldLabel>Filter</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FILTERS.map((filter) => {
                const selected = filter.id === experience.filterId
                return (
                  <Button
                    key={filter.id}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    onClick={() =>
                      onChange({ ...experience, filterId: filter.id })
                    }
                  >
                    {filter.name}
                  </Button>
                )
              })}
            </div>
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>Time between photos</FieldLabel>
              <Badge variant="secondary">{experience.intervalSeconds}s</Badge>
            </div>
            <Slider
              aria-label="Time between photos in seconds"
              min={MIN_INTERVAL}
              max={MAX_INTERVAL}
              step={1}
              value={[experience.intervalSeconds]}
              onValueChange={(next) =>
                onChange({
                  ...experience,
                  intervalSeconds: typeof next === "number" ? next : next[0],
                })
              }
            />
            <FieldDescription>
              A countdown runs for this long before each photo.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>

      <CardFooter>
        <StepActions onBack={onBack} onNext={onNext} />
      </CardFooter>
    </Card>
  )
}
