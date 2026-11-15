import { useEffect, useState } from "react"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

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
import { Switch } from "#components/ui/switch"

import { FILTERS, MAX_INTERVAL, MIN_INTERVAL, getFilter } from "../constants"
import type { CameraState } from "../hooks/use-camera"
import type { Experience } from "../types"
import { CameraPreview } from "./camera-preview"
import { StepActions } from "./step-actions"

const clampInterval = (value: number) =>
  Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, value))

type SecondsInputProps = {
  id: string
  value: number
  onChange: (next: number) => void
}

/** A number box with attached up/down buttons, limited to the allowed interval range. */
function SecondsInput({ id, value, onChange }: SecondsInputProps) {
  // What's typed in the box. It can be empty or out of range while typing, so
  // it is kept apart from `value`, which is always valid.
  const [draft, setDraft] = useState(String(value))

  // Follow the slider and the buttons.
  useEffect(() => setDraft(String(value)), [value])

  // Typing: apply the number as soon as it is a valid whole number in range.
  const handleChange = (raw: string) => {
    setDraft(raw)
    const number = Number(raw)
    if (
      raw.trim() !== "" &&
      Number.isInteger(number) &&
      number >= MIN_INTERVAL &&
      number <= MAX_INTERVAL
    ) {
      onChange(number)
    }
  }

  // Leaving the box: clamp what was typed, or go back to the current value if
  // it isn't a number.
  const commit = () => {
    const number = Math.round(Number(draft))
    if (draft.trim() === "" || Number.isNaN(number)) {
      setDraft(String(value))
      return
    }
    const next = clampInterval(number)
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <div className="flex h-10 w-28 shrink-0 items-center overflow-hidden rounded-md border bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={MIN_INTERVAL}
        max={MAX_INTERVAL}
        step={1}
        value={draft}
        aria-label="Time between photos in seconds"
        onChange={(event) => handleChange(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit()
        }}
        // The native spinner is hidden; the buttons on the right replace it.
        className="h-full min-w-0 flex-1 [appearance:textfield] bg-transparent pr-1 pl-3 text-right text-sm tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span aria-hidden className="pr-2 text-sm text-muted-foreground">
        s
      </span>
      <div className="flex h-full w-8 flex-col border-l">
        <button
          type="button"
          aria-label="Increase seconds"
          disabled={value >= MAX_INTERVAL}
          onClick={() => onChange(clampInterval(value + 1))}
          className="flex flex-1 items-center justify-center border-b text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronUpIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Decrease seconds"
          disabled={value <= MIN_INTERVAL}
          onClick={() => onChange(clampInterval(value - 1))}
          className="flex flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronDownIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

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
  const setInterval = (intervalSeconds: number) =>
    onChange({ ...experience, intervalSeconds })

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
            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex flex-1 justify-center items-center rounded-xl border bg-muted/40 px-4">
                <Slider
                  aria-label="Time between photos in seconds"
                  min={MIN_INTERVAL}
                  max={MAX_INTERVAL}
                  step={1}
                  value={[experience.intervalSeconds]}
                  onValueChange={(next) =>
                    setInterval(typeof next === "number" ? next : next[0])
                  }
                />
              </div>
              <SecondsInput
                id="interval-seconds"
                value={experience.intervalSeconds}
                onChange={setInterval}
              />
            </div>
            <FieldDescription>
              A countdown runs for this long before each photo.
            </FieldDescription>
          </Field>

          <Field>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <FieldLabel htmlFor="remove-background">
                  Remove background
                </FieldLabel>
                <FieldDescription>
                  Cuts the background live.
                </FieldDescription>
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
