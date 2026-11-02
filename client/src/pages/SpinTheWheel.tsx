import { useMemo, useState } from "react"
import {
  DEFAULT_ENTRIES,
  EntriesCard,
  Wheel,
  WinnerDialog,
  entriesToText,
  parseEntries,
  shuffle,
  sortEntries,
} from "#features/spin-the-wheel"
import type { SpinRecord, SpinResult } from "#features/spin-the-wheel"
import { usePageTitle } from "#hooks/use-page-title"

export default function SpinTheWheel() {
  usePageTitle("Spin the Wheel")

  const [text, setText] = useState(() => DEFAULT_ENTRIES.join("\n"))
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<SpinResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [results, setResults] = useState<SpinRecord[]>([])

  const entries = useMemo(() => parseEntries(text), [text])

  const handleSpinEnd = (result: SpinResult) => {
    setSpinning(false)
    setWinner(result)
    setDialogOpen(true)
    setResults((previous) => [
      {
        id: `${Date.now()}-${previous.length}`,
        label: result.entry.label,
        color: result.color,
        time: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      },
      ...previous,
    ])
  }

  const handleRemoveWinner = () => {
    if (winner) {
      setText(entriesToText(entries.filter((_, i) => i !== winner.index)))
    }
    setDialogOpen(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">
          Spin the Wheel
        </h1>
        <p className="text-muted-foreground">
          Add your entries, give the wheel a spin, and let fate decide.
        </p>
      </header>

      <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section
          aria-label="Wheel"
          className="flex flex-col items-center justify-center gap-5 pr-2 sm:pr-3"
        >
          <Wheel
            entries={entries}
            onSpinStart={() => setSpinning(true)}
            onSpinEnd={handleSpinEnd}
          />
        </section>

        <EntriesCard
          text={text}
          onTextChange={setText}
          entryCount={entries.length}
          onShuffle={() => setText(entriesToText(shuffle(entries)))}
          onSort={() => setText(entriesToText(sortEntries(entries)))}
          results={results}
          onClearResults={() => setResults([])}
          disabled={spinning}
        />
      </div>

      <WinnerDialog
        open={dialogOpen}
        winner={winner}
        onOpenChange={setDialogOpen}
        onRemove={handleRemoveWinner}
      />
    </div>
  )
}
