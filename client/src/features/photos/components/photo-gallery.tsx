import { ImageIcon } from "lucide-react"

import { Button } from "#components/ui/button"
import { useInfiniteScroll } from "../hooks/use-infinite-scroll.ts"
import type { PhotoFeed } from "../hooks/use-photo-feed.ts"
import { PhotoGrid } from "./photo-grid.tsx"

function LoadError({
  message,
  onRetry,
  title,
}: {
  message: string
  onRetry: () => void
  title?: string
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 py-12 text-center"
    >
      {title && <p className="font-heading text-lg font-semibold">{title}</p>}
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

/** The gallery wall: loads pages from the API as the person scrolls. */
export function PhotoGallery({ feed }: { feed: PhotoFeed }) {
  const { photos, hasMore, isLoading, isFetchingMore, error, loadMore } = feed

  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore && !isLoading && !isFetchingMore && !error,
    onLoadMore: () => void loadMore(),
  })

  if (isLoading) {
    return <PhotoGrid photos={[]} skeletonRows={3} />
  }

  if (error && photos.length === 0) {
    return (
      <LoadError
        title="Couldn't load the gallery"
        message={error}
        onRetry={() => void loadMore()}
      />
    )
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ImageIcon
          className="size-10 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="font-heading text-lg font-semibold">No photos yet</p>
        <p className="text-sm text-muted-foreground">
          Photos that get uploaded will show up here.
        </p>
      </div>
    )
  }

  return (
    <>
      <PhotoGrid photos={photos} skeletonRows={isFetchingMore ? 1 : 0} />
      {/* Triggers the next page when it nears the viewport. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {error ? (
        <LoadError message={error} onRetry={() => void loadMore()} />
      ) : (
        !hasMore && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            You've reached the end.
          </p>
        )
      )}
    </>
  )
}
