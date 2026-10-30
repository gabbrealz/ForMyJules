# API Reference

All endpoints live under `/api` and speak JSON. Authentication uses a session cookie, not tokens.

## Contents

- [Conventions](#conventions)
- [Roles](#roles)
- [Auth](#auth) — `/api/auth`
- [Admin](#admin) — `/api/admin`
- [Photos](#photos) — `/api/photos`
- [Uploads](#uploads) — `/api/uploads`
- [Typical upload flow](#typical-upload-flow)
- [Endpoint summary](#endpoint-summary)

---

## Conventions

### Authentication

Logging in sets an `httpOnly` cookie named `sid` (7-day lifetime, stored server-side in MongoDB). Send it with every request:

- Browser `fetch`: use `credentials: 'include'`.
- In production the cookie is `Secure` (HTTPS only). `SameSite` defaults to `lax`; set `COOKIE_SAMESITE=none` if the frontend is on a different site than the API.

The user is re-loaded from the database on every authenticated request, so deleting an account or moving it back to `pending_approval` takes effect immediately (the session is destroyed and the next call returns `401`).

### Request bodies

Send `Content-Type: application/json`. Unknown keys in a body are silently stripped. Strings described as "trimmed" or "lowercased" are normalized before use.

### Common error responses

| Status | Body | When |
|---|---|---|
| `400` | `{ "error": "Validation failed", "details": [{ "field": "username", "message": "..." }] }` | Body, params or query failed validation. `field` is a dotted path. |
| `400` | `{ "error": "Bad request" }` | Malformed JSON body or other client error raised by Express. |
| `401` | `{ "error": "Authentication required" }` | No session, or the session's user no longer exists / is pending. |
| `403` | `{ "error": "Admin access required" }` | Authenticated but not an admin (admin routes only). |
| `429` | `{ "error": "Too many requests. Please slow down.", "code": "rate_limited" }` | A per-user rate limit was hit. Standard `RateLimit*` headers (draft-7) are included. |
| `500` | `{ "error": "Internal server error" }` | Unexpected server error. |

Only endpoint-specific errors are listed in each section below; the common ones above can occur on any endpoint that mentions the corresponding middleware.

### Shared object shapes

**PublicUser**

```json
{
  "id": "665f1c2e8a1b2c3d4e5f6a7b",
  "username": "alice",
  "nickname": "Alice",
  "role": "admin"
}
```

`role` is one of `admin`, `partner`, `guest`, `pending_approval`.

**Photo**

```json
{
  "id": "3f2b8c1e-5d4a-4b7e-9c0d-1a2b3c4d5e6f",
  "kind": "photo",
  "w": 3024,
  "h": 4032,
  "thumbhash": "3OcRJYB4d3h/iIeHeEh3eIhw+j3A",
  "hasAlpha": false,
  "takenAt": "2026-08-14T09:30:00.000Z",
  "createdAt": "2026-10-30T14:05:12.481Z",
  "thumbUrl": "https://res.cloudinary.com/.../photos/3f2b.../thumb",
  "fullUrl": "https://res.cloudinary.com/.../photos/3f2b.../full"
}
```

- `id` is the upload id (a lowercase UUID), not the MongoDB `_id`.
- `kind` is `photo`, `graphic` or `sticker`.
- `w` / `h` are the stored dimensions with orientation applied.
- `takenAt` is an ISO 8601 string or `null`.
- `thumbUrl` / `fullUrl` are signed Cloudinary URLs. They are rebuilt on every response, but are deterministic (no expiry), so the same photo always yields the same URL and browser caching works.

---

## Roles

| Role | Meaning |
|---|---|
| `pending_approval` | Default for new sign-ups. Cannot log in or use any authenticated endpoint. |
| `guest` | Approved user. |
| `partner` | Approved user. |
| `admin` | Approved user who can use `/api/admin/*`. Created only with `npm run create-admin`, never through the API. |

Currently, every approved role (`guest`, `partner`, `admin`) can list, upload and save photos; only the admin routes are role-restricted.

---

## Auth

Base path: `/api/auth`

### `POST /api/auth/signup`

Creates an account with role `pending_approval`. No session is created; an admin must approve the account before the user can log in.

**Auth:** none

**Body**

| Field | Type | Rules |
|---|---|---|
| `username` | string | Trimmed, lowercased. 3–30 characters, only `a-z`, `0-9`, `_`. |
| `nickname` | string | Trimmed. 1–32 characters, no control characters (Unicode and emoji are fine). |
| `password` | string | Not trimmed. At least 8 characters and at most 72 bytes in UTF-8 (bcrypt limit; non-ASCII characters use more than one byte). |

```json
{ "username": "alice", "nickname": "Alice", "password": "a long passphrase" }
```

**Responses**

`201 Created`

```json
{
  "message": "Account created. An admin needs to approve it before you can log in.",
  "user": { "id": "665f...", "username": "alice", "nickname": "Alice", "role": "pending_approval" }
}
```

`409 Conflict` — username already exists

```json
{ "error": "That username is already taken" }
```

`400` — validation failed (see [common errors](#common-error-responses)).

---

### `POST /api/auth/login`

Verifies credentials and starts a session (sets the `sid` cookie). A new session id is issued on every login.

**Auth:** none

**Body**

| Field | Type | Rules |
|---|---|---|
| `username` | string | Trimmed, lowercased. 1–30 characters. |
| `password` | string | Required, at most 72 bytes in UTF-8. Strength rules are not re-applied on login. |

```json
{ "username": "alice", "password": "a long passphrase" }
```

**Responses**

`200 OK`

```json
{ "user": { "id": "665f...", "username": "alice", "nickname": "Alice", "role": "partner" } }
```

`401 Unauthorized` — unknown username or wrong password (the two are indistinguishable)

```json
{ "error": "Invalid username or password" }
```

`403 Forbidden` — correct credentials, but the account has not been approved yet

```json
{ "error": "Your account is waiting for admin approval", "code": "pending_approval" }
```

`400` — validation failed.

---

### `POST /api/auth/logout`

Destroys the session and clears the `sid` cookie. Safe to call when not logged in.

**Auth:** none · **Body:** none

**Responses**

`204 No Content`

---

### `GET /api/auth/me`

Returns the current user. Useful on page load to check whether the visitor is logged in.

**Auth:** required · **Body:** none

**Responses**

`200 OK`

```json
{ "user": { "id": "665f...", "username": "alice", "nickname": "Alice", "role": "partner" } }
```

`401 Unauthorized` — not logged in.

---

## Admin

Base path: `/api/admin`

**Auth:** every route here requires a logged-in user with role `admin`. Non-admins receive `403 { "error": "Admin access required" }`; unauthenticated requests receive `401`.

### `GET /api/admin/users/pending`

Lists accounts waiting for approval, oldest first.

**Body:** none

**Responses**

`200 OK`

```json
{
  "users": [
    {
      "id": "665f...",
      "username": "bob",
      "nickname": "Bob",
      "role": "pending_approval",
      "createdAt": "2026-10-29T08:12:44.120Z"
    }
  ]
}
```

---

### `POST /api/admin/users/:id/approve`

Promotes a pending account to `partner` or `guest`. Only accounts that are currently `pending_approval` can be approved.

**URL params**

| Param | Rules |
|---|---|
| `id` | MongoDB ObjectId (24 hex characters). |

**Body**

| Field | Type | Rules |
|---|---|---|
| `role` | string | `"partner"` or `"guest"`. (`admin` cannot be assigned here.) |

```json
{ "role": "partner" }
```

**Responses**

`200 OK`

```json
{ "user": { "id": "665f...", "username": "bob", "nickname": "Bob", "role": "partner" } }
```

`404 Not Found` — no pending user with that id (including users who are already approved)

```json
{ "error": "Pending user not found" }
```

`400` — invalid `id` or `role`.

---

### `POST /api/admin/users/:id/reject`

Deletes a pending account, which frees the username for reuse. Only pending accounts can be rejected.

**URL params:** `id` — 24-character hex ObjectId · **Body:** none

**Responses**

`204 No Content`

`404 Not Found`

```json
{ "error": "Pending user not found" }
```

`400` — invalid `id`.

---

## Photos

Base path: `/api/photos`

**Auth:** every route here requires a logged-in, approved user.

### `GET /api/photos`

Returns one page of photos, newest first, using cursor pagination. Photos from all users are included.

**Query string**

| Param | Type | Rules |
|---|---|---|
| `cursor` | string, optional | Value of `nextCursor` from the previous page (24 hex characters). Omit for the first page. |
| `limit` | integer, optional | 1–100. Default `40`. |
| `kind` | string, optional | `photo`, `graphic` or `sticker`. Filters results. |

Example: `GET /api/photos?limit=40&kind=photo&cursor=665f1c2e8a1b2c3d4e5f6a7b`

**Responses**

`200 OK`

```json
{
  "photos": [ /* Photo objects, see "Shared object shapes" */ ],
  "nextCursor": "665f1c2e8a1b2c3d4e5f6a7b"
}
```

`nextCursor` is `null` on the last page. Pass it unchanged as `cursor` to fetch the next page.

`400` — invalid `cursor`, `limit` or `kind`.

---

### `POST /api/photos`

Saves metadata for an image whose two Cloudinary uploads (`full` and `thumb`) have **already finished**. The server asks Cloudinary what actually landed under that id and takes the real format and byte sizes from there, rather than trusting the client.

**Rate limit:** 200 requests per 15 minutes per user (counted separately from `/api/uploads/sign`).

**Body**

| Field | Type | Rules |
|---|---|---|
| `id` | string | The `id` returned by `POST /api/uploads/sign`. Lowercase UUID. |
| `kind` | string, optional | `photo`, `graphic` or `sticker`. Defaults to `sticker` if `hasAlpha` is true, otherwise `photo`. |
| `w`, `h` | integer | 1–50000. Stored dimensions, orientation applied. |
| `origW`, `origH` | integer | 1–50000. Original dimensions. |
| `thumbhash` | string | Base64 (`btoa` style), 8–120 characters. |
| `hasAlpha` | boolean | Whether the image has transparency. |
| `compressed` | boolean | `true` if the client compressed the full image. Compressed output must be WebP. |
| `origBytes` | integer | 1 to 2 GiB (2,147,483,648). Size of the original file. |
| `takenAt` | string, optional / `null` | ISO 8601 datetime with offset, e.g. `2026-08-14T17:30:00+08:00`. |

The client must **not** send `fullFormat`, `fullBytes` or `thumbBytes`; they are ignored (read from Cloudinary instead).

```json
{
  "id": "3f2b8c1e-5d4a-4b7e-9c0d-1a2b3c4d5e6f",
  "w": 3024,
  "h": 4032,
  "origW": 6048,
  "origH": 8064,
  "thumbhash": "3OcRJYB4d3h/iIeHeEh3eIhw+j3A",
  "hasAlpha": false,
  "compressed": true,
  "origBytes": 5242880,
  "takenAt": "2026-08-14T17:30:00+08:00"
}
```

**Responses**

`201 Created`

```json
{ "photo": { /* Photo object */ } }
```

`409 Conflict` — this `id` was already saved

```json
{ "error": "This photo has already been saved", "code": "already_saved" }
```

`422 Unprocessable Entity` — one or both files are not on Cloudinary yet

```json
{
  "error": "The uploaded files were not found on Cloudinary. Finish both uploads, then try again.",
  "code": "assets_missing"
}
```

`422 Unprocessable Entity` — the uploaded files don't meet the rules

```json
{ "error": "<reason>", "code": "invalid_assets" }
```

Possible `error` messages:

- `Unsupported image format: <format>. Allowed: JPEG, PNG, WebP, GIF.`
- `The thumbnail must be a WebP image.`
- `Marked as compressed, but the stored file is <format>, not WebP.`

`400` — validation failed · `429` — rate limited.

---

## Uploads

Base path: `/api/uploads`

**Auth:** every route here requires a logged-in, approved user.

### `POST /api/uploads/sign`

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

`429` — rate limited.

---

### `GET /api/uploads/storage`

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
4. After **both** uploads succeed, `POST /api/photos` with the `id` and the image metadata.
5. `GET /api/photos` to list photos; use `thumbUrl` for grids and `fullUrl` for the detail view.

If step 4 fails with `assets_missing`, a Cloudinary upload hasn't completed; finish it and retry with the same `id`.

---

## Endpoint summary

| Method | Path | Auth | Success | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/signup` | none | `201` | Create a pending account |
| `POST` | `/api/auth/login` | none | `200` | Log in, set session cookie |
| `POST` | `/api/auth/logout` | none | `204` | Log out, clear cookie |
| `GET` | `/api/auth/me` | user | `200` | Current user |
| `GET` | `/api/admin/users/pending` | admin | `200` | List pending accounts |
| `POST` | `/api/admin/users/:id/approve` | admin | `200` | Approve as `partner` / `guest` |
| `POST` | `/api/admin/users/:id/reject` | admin | `204` | Delete a pending account |
| `GET` | `/api/photos` | user | `200` | Paginated photo list |
| `POST` | `/api/photos` | user | `201` | Save metadata after uploads finish |
| `POST` | `/api/uploads/sign` | user | `200` | Get Cloudinary upload signatures |
| `GET` | `/api/uploads/storage` | user | `200` | Storage usage status |
