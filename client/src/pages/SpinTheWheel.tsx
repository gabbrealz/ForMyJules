import { useMemo, useState } from "react"

import { PageShell } from "#layouts/page-shell"
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
    <PageShell
      title="Spin the Wheel"
      subtitle="Add your entries, give the wheel a spin, and let fate decide."
    >
      <div className="grid items-stretch gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section
          aria-label="Wheel"
          className="flex flex-col items-center justify-center gap-5 pr-2 sm:pr-3"
        >
          <Wheel
            entries={entries}
            paused={dialogOpen}
            onSpinStart={() => setSpinning(true)}
            onSpinEnd={handleSpinEnd}
          />
        </section>
        <div className="flex justify-center">
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
      </div>

      <WinnerDialog
        open={dialogOpen}
        winner={winner}
        onOpenChange={setDialogOpen}
        onRemove={handleRemoveWinner}
      />
    </PageShell>
  )
}
