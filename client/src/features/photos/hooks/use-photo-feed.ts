import { useCallback, useEffect, useRef, useState } from "react"
import { HttpError } from "#services/http-client"
import { photosApi, type ListPhotosParams } from "../services/photos-api.ts"
import type { Photo } from "../types.ts"
import { PHOTO_PAGE_SIZE, appendUnique, prependUnique } from "../utils.ts"

const FALLBACK_ERROR = "Couldn't load photos. Check your connection and try again."

/**
 * The gallery's photos, newest first, loaded one cursor page at a time.
 * The first page is requested on mount; call `loadMore` for the next one (it
 * does nothing while a request is running or once the last page has loaded).
 * After a failure, `loadMore` is also the retry.
 */
export function usePhotoFeed() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [hasMore, setHasMore] = useState(true)
  // Starts true because the first page is requested as soon as the page mounts.
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cursorRef = useRef<string | undefined>(undefined)
  const endedRef = useRef(false)
  // The request in flight, if any. Doubles as the "don't start another" guard.
  const requestRef = useRef<AbortController | null>(null)

  const loadMore = useCallback(async () => {
    if (requestRef.current || endedRef.current) return

    const controller = new AbortController()
    requestRef.current = controller
    setFetching(true)
    setError(null)

    const params: ListPhotosParams = { limit: PHOTO_PAGE_SIZE }
    if (cursorRef.current) params.cursor = cursorRef.current

    try {
      const page = await photosApi.list(params, { signal: controller.signal })
      if (controller.signal.aborted) return
      cursorRef.current = page.nextCursor ?? undefined
      endedRef.current = page.nextCursor === null
      setHasMore(page.nextCursor !== null)
      setPhotos((current) => appendUnique(current, page.photos))
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof HttpError ? err.message : FALLBACK_ERROR)
    } finally {
      // An aborted request was already replaced or abandoned; leave the newer state alone.
      if (requestRef.current === controller) {
        requestRef.current = null
        setFetching(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadMore()
    return () => {
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [loadMore])

  /** Shows freshly uploaded photos at the top without refetching. */
  const prepend = useCallback((added: Photo[]) => {
    setPhotos((current) => prependUnique(current, added))
  }, [])

  /** Permanently deletes a photo on the server, then drops it from the list. Throws if the request fails. */
  const remove = useCallback(async (id: string) => {
    await photosApi.remove(id)
    setPhotos((current) => current.filter((photo) => photo.id !== id))
  }, [])

  return {
    photos,
    hasMore,
    error,
    /** First page still loading (nothing to show yet). */
    isLoading: fetching && photos.length === 0,
    /** A later page is loading. */
    isFetchingMore: fetching && photos.length > 0,
    loadMore,
    prepend,
    remove,
  }
}

export type PhotoFeed = ReturnType<typeof usePhotoFeed>
