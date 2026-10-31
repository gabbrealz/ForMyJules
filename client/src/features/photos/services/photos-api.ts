import { http, type RequestOptions } from "#services/http-client"
import type { Photo, PhotoKind } from "../types.ts"

export type ListPhotosParams = {
  /** `nextCursor` from the previous page. Omit for the first page. */
  cursor?: string
  /** 1 to 100. The server defaults to 40. */
  limit?: number
  kind?: PhotoKind
}

export type PhotoPage = {
  /** Newest first, from every user. */
  photos: Photo[]
  /** Pass unchanged as `cursor` for the next page. null on the last page. */
  nextCursor: string | null
}

/**
 * Metadata for an image whose Cloudinary uploads (full + thumb) have already
 * finished. Don't send format or byte sizes: the server reads those from Cloudinary.
 */
export type CreatePhotoRequest = {
  /** The id from uploadsApi.sign(). */
  id: string
  /** Defaults to "sticker" when hasAlpha is true, otherwise "photo". */
  kind?: PhotoKind
  /** Stored dimensions, orientation applied (1 to 50000). */
  w: number
  h: number
  /** Original dimensions (1 to 50000). */
  origW: number
  origH: number
  /** Base64, 8 to 120 characters. */
  thumbhash: string
  hasAlpha: boolean
  /** true if the client compressed the full image. Compressed output must be WebP. */
  compressed: boolean
  /** Size of the original file in bytes (1 to 2 GiB). */
  origBytes: number
  /** ISO 8601 datetime with offset, e.g. 2026-08-14T17:30:00+08:00. */
  takenAt?: string | null
}

/** Only these two fields are editable; the rest describe the stored files. Send at least one. */
export type UpdatePhotoRequest = {
  kind?: PhotoKind
  /** ISO 8601 datetime with offset to set it, null to clear it, omit the key to keep it. */
  takenAt?: string | null
}

// /api/photos
// Viewing is open to every role. Creating, editing and deleting need `partner` or
// `admin` (any photo, whoever uploaded it); guests get 403 with code "forbidden".
export const photosApi = {
  /** One page of photos, newest first. Open to every role. */
  list(params: ListPhotosParams = {}, opts?: RequestOptions) {
    const query = new URLSearchParams()
    if (params.cursor) query.set("cursor", params.cursor)
    if (params.limit !== undefined) query.set("limit", String(params.limit))
    if (params.kind) query.set("kind", params.kind)
    const qs = query.toString()
    return http.get<PhotoPage>(`/api/photos${qs ? `?${qs}` : ""}`, opts)
  },

  /**
   * Saves a photo's metadata once both Cloudinary uploads succeeded.
   * Errors: 403 (guest), 409 code "already_saved", 422 code "assets_missing" (an
   * upload hasn't finished: finish it, then retry with the same id) or
   * "invalid_assets", 429.
   */
  async create(body: CreatePhotoRequest, opts?: RequestOptions): Promise<Photo> {
    const { photo } = await http.post<{ photo: Photo }>("/api/photos", body, opts)
    return photo
  },

  /**
   * Edits `kind` and/or `takenAt` on any photo and returns the updated photo.
   * Errors: 400 (empty body or invalid field), 403 (guest), 404 code "not_found".
   */
  async update(id: string, body: UpdatePhotoRequest, opts?: RequestOptions): Promise<Photo> {
    const { photo } = await http.patch<{ photo: Photo }>(
      `/api/photos/${encodeURIComponent(id)}`,
      body,
      opts
    )
    return photo
  },

  /**
   * Permanently deletes a photo and its Cloudinary assets. This can't be undone, so
   * confirm with the person first. Errors: 403 (guest), 404 code "not_found", 429.
   */
  remove: (id: string, opts?: RequestOptions) =>
    http.delete<void>(`/api/photos/${encodeURIComponent(id)}`, opts),
}
