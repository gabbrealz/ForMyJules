import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { Button } from "#components/ui/button"

type StepActionsProps = {
  onBack?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  nextLabel?: string
}

export function StepActions({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Next",
}: StepActionsProps) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      {onBack ? (
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeftIcon /> Back
        </Button>
      ) : (
        <span />
      )}
      {onNext && (
        <Button type="button" onClick={onNext} disabled={nextDisabled}>
          {nextLabel} <ArrowRightIcon />
        </Button>
      )}
    </div>
  )
}
