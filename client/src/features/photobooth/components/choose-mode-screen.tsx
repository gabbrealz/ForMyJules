import type { ReactNode } from "react"
import { UserIcon, UsersIcon } from "lucide-react"

import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import type { PhotoboothMode } from "../types"

const MODES: {
  id: PhotoboothMode
  title: string
  description: string
  icon: ReactNode
}[] = [
  {
    id: "solo",
    title: "Solo",
    description: "Just you, on this device.",
    icon: <UserIcon className="size-8" />,
  },
  {
    id: "with-others",
    title: "With Others",
    description: "Join a shared session and take photos together.",
    icon: <UsersIcon className="size-8" />,
  },
]

type ChooseModeScreenProps = {
  onSelect: (mode: PhotoboothMode) => void
}

/**
 * Shown when the photobooth opens, before the stepper. Picking a mode moves on
 * straight away, so there is no Next button.
 */
export function ChooseModeScreen({ onSelect }: ChooseModeScreenProps) {
  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="font-heading text-lg">
          How do you want to take photos?
        </CardTitle>
        <CardDescription>
          You can go solo or join others in a shared session.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map(({ id, title, description, icon }) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              onClick={() => onSelect(id)}
              className="h-auto flex-col gap-2 py-6 whitespace-normal"
            >
              {icon}
              <span className="font-heading text-lg font-bold">{title}</span>
              <span className="text-sm font-normal opacity-80">
                {description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
