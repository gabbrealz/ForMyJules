import { motion, useReducedMotion } from "framer-motion"
import { Trophy } from "lucide-react"
import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import { SLICE_COLORS } from "../constants"
import type { SpinResult } from "../types"
import { TAU } from "../utils"

interface WinnerDialogProps {
  open: boolean
  winner: SpinResult | null
  onOpenChange: (open: boolean) => void
  /** Removes the winner from the wheel and closes the dialog. */
  onRemove: () => void
}

// Deterministic pseudo-random so the confetti layout is stable (and render stays pure).
const seeded = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const CONFETTI_COUNT = 40

const CONFETTI = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
  const angle = (i / CONFETTI_COUNT) * TAU + seeded(i) * 0.6
  const distance = 200 + seeded(i + 50) * 120
  return {
    id: i,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance * 0.7 - 20,
    fall: 80 + seeded(i + 99) * 120,
    rotate: (seeded(i + 7) - 0.5) * 720,
    color: SLICE_COLORS[i % SLICE_COLORS.length],
    width: 6 + seeded(i + 3) * 6,
    height: 10 + seeded(i + 5) * 8,
    delay: seeded(i + 11) * 0.12,
  }
})

function Confetti() {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      {CONFETTI.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute top-1/3 left-1/2 rounded-[2px] shadow-sm"
          style={{
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
          }}
          initial={{ x: 0, y: 0, opacity: 0.25, scale: 0.4, rotate: 0 }}
          animate={{
            x: [0, piece.x, piece.x * 1.1],
            y: [0, piece.y, piece.y + piece.fall],
            opacity: [0.25, 1, 0],
            scale: 1,
            rotate: piece.rotate,
          }}
          transition={{
            duration: 3,
            delay: piece.delay,
            ease: "easeOut",
            times: [0, 0.35, 1],
          }}
        />
      ))}
    </div>
  )
}

export function WinnerDialog({
  open,
  winner,
  onOpenChange,
  onRemove,
}: WinnerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden text-center sm:max-w-md">
        <Confetti />

        <DialogHeader className="items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Trophy className="size-6" />
          </span>
          <DialogTitle className="font-heading text-2xl font-extrabold">
            We have a winner!
          </DialogTitle>
          <DialogDescription>The wheel has spoken.</DialogDescription>
        </DialogHeader>

        <div
          className="rounded-2xl px-6 py-6 shadow-inner"
          style={{ backgroundColor: winner?.color }}
        >
          <p className="font-heading text-3xl font-extrabold break-words text-brown sm:text-4xl">
            {winner?.entry.label}
          </p>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button type="button" onClick={onRemove}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
