import { http, type RequestOptions } from "#services/http-client"
import type { SignUploadResponse, StorageStatus } from "../types.ts"

// /api/uploads: `partner` or `admin` only. Guests are view-only and get 403.
export const uploadsApi = {
  /**
   * Signed parameters for direct-to-Cloudinary uploads (one for `full`, one for
   * `thumb`) plus the photo id the server picked. Call it once per photo.
   * Errors: 403 (guest), 507 code "storage_full" (HttpError.body.storage has the numbers), 429.
   */
  sign: (opts?: RequestOptions) =>
    http.post<SignUploadResponse>("/api/uploads/sign", undefined, opts),

  /** Cloudinary usage, cached for about 5 minutes on the server. 403 for guests. */
  getStorage: (opts?: RequestOptions) =>
    http.get<StorageStatus>("/api/uploads/storage", opts),
}
