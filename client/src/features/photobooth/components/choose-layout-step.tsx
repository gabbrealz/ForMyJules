import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { LAYOUTS } from "../constants"
import type { PhotoLayout } from "../types"
import { StepActions } from "./step-actions"

type ChooseLayoutStepProps = {
  layoutId: string | null
  onSelect: (layout: PhotoLayout) => void
  onNext: () => void
}

export function ChooseLayoutStep({
  layoutId,
  onSelect,
  onNext,
}: ChooseLayoutStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Choose a layout</CardTitle>
        <CardDescription>
          The layout decides how many photos you'll take.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {LAYOUTS.map((layout) => {
            const selected = layout.id === layoutId
            return (
              <Button
                key={layout.id}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() => onSelect(layout)}
                className="h-auto flex-col gap-1 py-4"
              >
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
      </CardContent>

      <CardFooter>
        <StepActions onNext={onNext} nextDisabled={!layoutId} />
      </CardFooter>
    </Card>
  )
}
