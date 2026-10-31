// Shapes returned by the photo and upload endpoints. See API.md ("Shared object shapes").

export type PhotoKind = "photo" | "graphic" | "sticker"

export type Photo = {
  /** Upload id (a lowercase UUID), not the MongoDB _id. */
  id: string
  kind: PhotoKind
  /** Stored dimensions, orientation applied. */
  w: number
  h: number
  /** Base64 ThumbHash, handy as a placeholder while `thumbUrl` loads. */
  thumbhash: string
  hasAlpha: boolean
  /** ISO 8601, or null when unknown. */
  takenAt: string | null
  /** ISO 8601 */
  createdAt: string
  /** Signed Cloudinary URLs. Deterministic, so browser caching works. */
  thumbUrl: string
  fullUrl: string
  /**
   * Whether the *viewer* may edit or delete photos (true for admin and partner,
   * false for guest). It depends on who is asking, not on the photo.
   * Use it to show or hide edit/delete buttons.
   */
  canEdit: boolean
}

// --- Uploads ---------------------------------------------------------------

/** Parameters to send to Cloudinary exactly as issued (they are part of the signature). */
export type SignedUploadParams = {
  public_id: string
  type: string
  overwrite: string
  timestamp: string
  signature: string
}

export type SignUploadResponse = {
  /** The photo id. Pass it back to POST /api/photos once both uploads finish. */
  id: string
  cloudName: string
  apiKey: string
  uploads: { full: SignedUploadParams; thumb: SignedUploadParams }
}

export type StorageStatus = {
  /** null if Cloudinary usage couldn't be read. */
  usedBytes: number | null
  budgetBytes: number
  /** null if usage is unknown. */
  remainingBytes: number | null
  /** 0 to 1, or null if usage is unknown. */
  usedRatio: number | null
  /** false once usage reaches 90% of the budget. true when usage is unknown. */
  uploadsAllowed: boolean
}
