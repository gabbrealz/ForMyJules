import { useCallback, useState } from "react"
import { CheckIcon } from "lucide-react"

import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "#components/ui/stepper"
import {
  ChooseLayoutStep,
  ConfigureExperienceStep,
  DEFAULT_EXPERIENCE,
  PickFrameStep,
  TakePhotosStep,
  useCamera,
  type Experience,
  type PhotoLayout,
} from "#features/photobooth"

// Steps are 1-indexed to match the Stepper component.
const STEPS = [
  { step: 1, title: "Layout", description: "Choose a layout" },
  { step: 2, title: "Experience", description: "Filter and timing" },
  { step: 3, title: "Photos", description: "Strike a pose" },
  { step: 4, title: "Frame", description: "Pick a frame" },
]

const INDICATORS = { completed: <CheckIcon className="size-3.5" /> }

export default function Photobooth() {
  const [step, setStep] = useState(1)
  const [layout, setLayout] = useState<PhotoLayout | null>(null)
  const [experience, setExperience] = useState<Experience>(DEFAULT_EXPERIENCE)
  const [photos, setPhotos] = useState<string[]>([])

  // The camera only runs while a step needs it (configure + take photos),
  // and the same stream carries over between the two.
  const camera = useCamera(step === 2 || step === 3)

  // Photos depend on the layout and the filter, so changing either discards them.
  const handleSelectLayout = useCallback(
    (next: PhotoLayout) => {
      if (next.id !== layout?.id) setPhotos([])
      setLayout(next)
    },
    [layout]
  )

  const handleExperienceChange = useCallback((next: Experience) => {
    setPhotos((current) => (current.length ? [] : current))
    setExperience(next)
  }, [])

  const handleCapture = useCallback(
    (dataUrl: string) => setPhotos((current) => [...current, dataUrl]),
    []
  )
  const handleReset = useCallback(() => setPhotos([]), [])

  // Later steps unlock as their prerequisites are met.
  const isComplete = layout !== null && photos.length >= layout.shots
  const isLocked = (target: number) =>
    (target >= 2 && layout === null) || (target >= 4 && !isComplete)

  const next = () => setStep((current) => Math.min(current + 1, STEPS.length))
  const back = () => setStep((current) => Math.max(current - 1, 1))

  return (
    <div className="flex w-full flex-col md:h-svh md:overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 md:p-8">
        <header className="mb-6 space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Photobooth
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a layout, set up the camera, and take your photos.
          </p>
        </header>

        <Stepper
          value={step}
          onValueChange={setStep}
          indicators={INDICATORS}
          className="space-y-6"
        >
          <StepperNav>
            {STEPS.map(({ step: n, title, description }) => (
              <StepperItem key={n} step={n} disabled={isLocked(n)}>
                <StepperTrigger>
                  <StepperIndicator>{n}</StepperIndicator>
                  <div className="hidden text-left sm:block">
                    <StepperTitle>{title}</StepperTitle>
                    <StepperDescription className="mt-1 text-xs">
                      {description}
                    </StepperDescription>
                  </div>
                </StepperTrigger>
                {n < STEPS.length && (
                  <StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
                )}
              </StepperItem>
            ))}
          </StepperNav>

          <StepperPanel>
            <StepperContent value={1}>
              <ChooseLayoutStep
                layoutId={layout?.id ?? null}
                onSelect={handleSelectLayout}
                onNext={next}
              />
            </StepperContent>

            <StepperContent value={2}>
              <ConfigureExperienceStep
                experience={experience}
                onChange={handleExperienceChange}
                camera={camera}
                onBack={back}
                onNext={next}
              />
            </StepperContent>

            <StepperContent value={3}>
              {layout && (
                <TakePhotosStep
                  layout={layout}
                  experience={experience}
                  camera={camera}
                  photos={photos}
                  onCapture={handleCapture}
                  onReset={handleReset}
                  onBack={back}
                  onNext={next}
                />
              )}
            </StepperContent>

            <StepperContent value={4}>
              <PickFrameStep />
            </StepperContent>
          </StepperPanel>
        </Stepper>
      </div>
    </div>
  )
}
