import { CheckIcon, LogOutIcon } from "lucide-react"

import { Button } from "#components/ui/button"
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

import { useCamera } from "../hooks/use-camera"
import { usePeerMesh } from "../rtc/use-peer-mesh"
import { useBoothSessionContext } from "../session/booth-session-context"
import type { BoothStep } from "../session/types"
import { GroupExperienceStep } from "./group-experience-step"
import { GroupFrameStep } from "./group-frame-step"
import { GroupLayoutStep } from "./group-layout-step"
import { GroupPhotosStep } from "./group-photos-step"
import { useGroupStills } from "./use-group-stills"

// Same four steps as the solo flow, driven by the server's `step` instead of local state.
const STEPS = [
  { step: 1, title: "Layout", description: "Choose a layout" },
  { step: 2, title: "Experience", description: "Filter and timing" },
  { step: 3, title: "Photos", description: "Strike a pose" },
  { step: 4, title: "Frame", description: "Pick a frame" },
]

const INDICATORS = { completed: <CheckIcon className="size-3.5" /> }

/**
 * The shared steps, shown once the leader starts from the waiting room. The server decides which
 * step the group is on; everyone's stepper follows it, and only the leader can move it.
 */
export function GroupBoothFlow({ onExit }: { onExit: () => void }) {
  const { state, isLeader, actions } = useBoothSessionContext()
  const step = state?.step ?? 1

  // Like the solo flow: the camera only runs while a step needs it, and the stream carries over
  // from the experience step to the photos step.
  const camera = useCamera(step === 2 || step === 3)
  // Live previews of the others, while cameras are on. Links are made at step 2, so they are
  // already up when the countdown starts.
  const previews = usePeerMesh(step === 2 || step === 3, camera.stream)
  // Held here, above the steps, so stills still arriving at the frame step aren't lost.
  const stills = useGroupStills()

  if (!state) return null

  const hasLayout = state.config.layoutId !== null
  // The server only lets the leader jump between steps 1 to 3 while there is no round. Once there
  // is one, the buttons inside the steps (Next, Retake, Take more photos) move the group instead,
  // and the frame step is reached only through the photos step's Next.
  const isLocked = (target: number) =>
    !isLeader || state.round !== null || target >= 4 || (target >= 2 && !hasLayout)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onExit}>
          <LogOutIcon /> Leave
        </Button>
      </div>

      <Stepper
        value={step}
        onValueChange={(next) => {
          if (isLeader) actions.go(next as BoothStep)
        }}
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
            <GroupLayoutStep />
          </StepperContent>
          <StepperContent value={2}>
            <GroupExperienceStep camera={camera} previews={previews} />
          </StepperContent>
          <StepperContent value={3}>
            <GroupPhotosStep
              camera={camera}
              stills={stills}
              previews={previews}
            />
          </StepperContent>
          <StepperContent value={4}>
            <GroupFrameStep stills={stills} />
          </StepperContent>
        </StepperPanel>
      </Stepper>
    </div>
  )
}
