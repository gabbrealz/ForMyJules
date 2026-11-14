# Uploads

[← Back to API Reference](README.md)

Base path: `/api/uploads`

**Auth:** every route here requires a logged-in `partner` or `admin`. Guests are view-only and get `403`.

## `POST /api/uploads/sign`

Issues signed parameters for direct-to-Cloudinary uploads: one signature for the `full` image and one for the `thumb`. The server chooses the photo id; the client can't pick or reuse one.

**Body:** none

**Rate limit:** 200 requests per 15 minutes per user (one call per photo being uploaded).

**Responses**

`200 OK`

```json
{
  "id": "3f2b8c1e-5d4a-4b7e-9c0d-1a2b3c4d5e6f",
  "cloudName": "my-cloud",
  "apiKey": "123456789012345",
  "uploads": {
    "full": {
      "public_id": "photos/3f2b8c1e-5d4a-4b7e-9c0d-1a2b3c4d5e6f/full",
      "type": "authenticated",
      "overwrite": "false",
      "timestamp": "1793371800",
      "signature": "a1b2c3..."
    },
    "thumb": {
      "public_id": "photos/3f2b8c1e-5d4a-4b7e-9c0d-1a2b3c4d5e6f/thumb",
      "type": "authenticated",
      "overwrite": "false",
      "timestamp": "1793371800",
      "signature": "d4e5f6..."
    }
  }
}
```

`507 Insufficient Storage` — Cloudinary storage is past the guard threshold (90% of the budget), so new uploads are disabled

```json
{
  "error": "Storage is almost full, so new uploads are disabled",
  "code": "storage_full",
  "storage": {
    "usedBytes": 18900000000,
    "budgetBytes": 21474836480,
    "remainingBytes": 2574836480,
    "usedRatio": 0.88,
    "uploadsAllowed": false
  }
}
```

`403` — guest · `429` — rate limited.

---

## `GET /api/uploads/storage`

Returns Cloudinary storage usage, e.g. to show remaining space next to a compression toggle. The usage figure is cached for about 5 minutes on the server.

**Body:** none

**Responses**

`200 OK`

```json
{
  "usedBytes": 1234567890,
  "budgetBytes": 21474836480,
  "remainingBytes": 20240268590,
  "usedRatio": 0.0575,
  "uploadsAllowed": true
}
```

| Field | Notes |
|---|---|
| `usedBytes` | `null` if Cloudinary usage couldn't be read. |
| `budgetBytes` | From `STORAGE_BUDGET_BYTES`; defaults to 20 GiB. |
| `remainingBytes` | `budgetBytes - usedBytes` (never negative), or `null` if usage is unknown. |
| `usedRatio` | `usedBytes / budgetBytes`, or `null` if usage is unknown. |
| `uploadsAllowed` | `false` once `usedRatio` reaches 0.9. `true` when usage is unknown (fails open). |

---

## Typical upload flow

1. **(Optional)** `GET /api/uploads/storage` to display remaining space.
2. `POST /api/uploads/sign` → get `id`, `cloudName`, `apiKey` and the `full` / `thumb` signed params.
3. Upload **both** files directly to Cloudinary. For each variant, send a `multipart/form-data` `POST` to
   `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` with these fields:
   - `file` — the image data
   - `api_key` — from the sign response
   - `public_id`, `type`, `overwrite`, `timestamp`, `signature` — copied exactly from that variant's object

   Every signed parameter must be sent with exactly the signed value, or Cloudinary rejects the upload. The `thumb` must be a WebP; the `full` must be JPEG, PNG, WebP or GIF (and WebP if `compressed` is true).
4. After **both** uploads succeed, [`POST /api/photos`](photos.md#post-apiphotos) with the `id` and the image metadata.
5. [`GET /api/photos`](photos.md#get-apiphotos) to list photos; use `thumbUrl` for grids and `fullUrl` for the detail view.

If step 4 fails with `assets_missing`, a Cloudinary upload hasn't completed; finish it and retry with the same `id`.
