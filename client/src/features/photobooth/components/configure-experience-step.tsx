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
  FieldGroup,
  FieldLabel,
} from "#components/ui/field"
import { Switch } from "#components/ui/switch"

import { FILTERS, INTERVALS, getFilter } from "../constants"
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
    <Card className="@container">
      <CardHeader>
        <CardTitle className="font-heading">Configure the experience</CardTitle>
        <CardDescription>
          Pick a camera filter and how long to wait between photos.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 @lg:grid-cols-2">
        <CameraPreview
          camera={camera}
          filter={getFilter(experience.filterId).css}
          removeBackground={experience.removeBackground}
        />

        <FieldGroup>
          <Field>
            <FieldLabel>Filter</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {FILTERS.map((filter) => {
                const selected = filter.id === experience.filterId
                return (
                  <Button
                    className="text-xs sm:text-sm"
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
            <FieldLabel htmlFor="interval-seconds">
              Time between photos
            </FieldLabel>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map((interval) => {
                const selected = interval.id === experience.intervalId
                return (
                  <Button
                    className="flex-1 text-xs sm:text-sm"
                    key={interval.id}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    onClick={() =>
                      onChange({ ...experience, intervalId: interval.id })
                    }
                  >
                    {interval.seconds}s
                  </Button>
                )
              })}
            </div>
          </Field>

          <Field>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <FieldLabel htmlFor="remove-background">
                  Remove background
                </FieldLabel>
              </div>
              <Switch
                id="remove-background"
                checked={experience.removeBackground}
                onCheckedChange={(checked) =>
                  onChange({ ...experience, removeBackground: checked })
                }
              />
            </div>
          </Field>
        </FieldGroup>
      </CardContent>

      <CardFooter>
        <StepActions onBack={onBack} onNext={onNext} />
      </CardFooter>
    </Card>
  )
}
