import type { ReactNode } from "react"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { Button } from "#components/ui/button"

/**
 * Wider and a little taller than the default button, with the default text and
 * icon size. `has-[>svg]:px-8` is needed because the button shrinks its padding
 * whenever it holds an icon.
 */
export const STEP_BUTTON_CLASS = "h-10 min-w-32 px-8 has-[>svg]:px-8"

type StepActionsProps = {
  onBack?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  backDisabled?: boolean
  nextLabel?: string
  /** Shown after the label. Defaults to an arrow. */
  nextIcon?: ReactNode
}

export function StepActions({
  onBack,
  onNext,
  nextDisabled,
  backDisabled,
  nextLabel = "Next",
  nextIcon = <ArrowRightIcon />,
}: StepActionsProps) {
  return (
    <div className="flex w-full items-center justify-between gap-1">
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          className={STEP_BUTTON_CLASS}
          onClick={onBack}
          disabled={backDisabled}
        >
          <ArrowLeftIcon /> Back
        </Button>
      ) : (
        <span />
      )}
      {onNext && (
        <Button
          type="button"
          className={STEP_BUTTON_CLASS}
          onClick={onNext}
          disabled={nextDisabled}
        >
          {nextLabel} {nextIcon}
        </Button>
      )}
    </div>
  )
}
