import { Badge } from "#components/ui/badge"
import { Card, CardContent, CardHeader } from "#components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs"
import type { SpinRecord } from "../types"
import { EntriesTab } from "./entries-tab"
import { ResultsTab } from "./results-tab"

interface EntriesCardProps {
  /** One entry per line; each line is edited in its own input. */
  text: string
  onTextChange: (text: string) => void
  entryCount: number
  onShuffle: () => void
  onSort: () => void
  results: SpinRecord[]
  onClearResults: () => void
  /** Locks editing while the wheel is turning. */
  disabled?: boolean
}

export function EntriesCard({
  text,
  onTextChange,
  entryCount,
  onShuffle,
  onSort,
  results,
  onClearResults,
  disabled = false,
}: EntriesCardProps) {
  return (
    <Card className="flex h-full min-h-[30rem] flex-col">
      <Tabs defaultValue="entries" className="flex min-h-0 flex-1 flex-col gap-4">
        <CardHeader>
          <TabsList className="w-full">
            <TabsTrigger value="entries" className="flex-1 gap-2">
              Entries
              <Badge variant="secondary">{entryCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex-1 gap-2">
              Results
              <Badge variant="secondary">{results.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col">
          <TabsContent value="entries" className="min-h-0 flex-1">
            <EntriesTab
              text={text}
              onTextChange={onTextChange}
              entryCount={entryCount}
              onShuffle={onShuffle}
              onSort={onSort}
              disabled={disabled}
            />
          </TabsContent>

          <TabsContent value="results" className="min-h-0 flex-1">
            <ResultsTab results={results} onClear={onClearResults} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
