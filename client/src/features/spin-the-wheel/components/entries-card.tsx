import type { ChangeEvent } from "react"
import { ArrowDownAZ, Shuffle, Trash2, Trophy } from "lucide-react"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { Card, CardContent, CardHeader } from "#components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs"
import { Textarea } from "#components/ui/textarea"
import type { SpinRecord } from "../types"

interface EntriesCardProps {
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
            <div className="flex h-full min-h-64 flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onShuffle}
                  disabled={disabled || entryCount < 2}
                >
                  <Shuffle />
                  Shuffle
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSort}
                  disabled={disabled || entryCount < 2}
                >
                  <ArrowDownAZ />
                  Sort
                </Button>
              </div>

              <Textarea
                aria-label="Entries, one per line"
                placeholder="Type one entry per line"
                value={text}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  onTextChange(event.target.value)
                }
                disabled={disabled}
                spellCheck={false}
                className="field-sizing-fixed min-h-48 flex-1 resize-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="results" className="min-h-0 flex-1">
            {results.length === 0 ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                <Trophy className="size-5" />
                Winners will show up here after each spin.
              </div>
            ) : (
              <div className="flex h-full min-h-64 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Most recent first
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClearResults}
                  >
                    <Trash2 />
                    Clear
                  </Button>
                </div>
                <ul className="max-h-96 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-none">
                  {results.map((result) => (
                    <li
                      key={result.id}
                      className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2"
                    >
                      <span
                        aria-hidden
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: result.color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {result.label}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {result.time}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
