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
| `403` | `{ "error": "Admin access required" }` | Authenticated but not an admin (`/api/admin/*` only). |
| `403` | `{ "error": "You do not have permission to do this", "code": "forbidden" }` | Authenticated but the role isn't allowed to do this, e.g. a guest trying to upload, edit or delete a photo. |
| `429` | `{ "error": "Too many requests. Please slow down.", "code": "rate_limited" }` | A rate limit was hit (per user on photo/upload routes, per IP on login and signup). Standard `RateLimit*` headers (draft-7) are included. |
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
  "canEdit": true,
  "thumbUrl": "https://res.cloudinary.com/.../photos/3f2b.../thumb",
  "fullUrl": "https://res.cloudinary.com/.../photos/3f2b.../full"
}
```

- `id` is the upload id (a lowercase UUID), not the MongoDB `_id`.
- `kind` is `photo`, `graphic` or `sticker`.
- `w` / `h` are the stored dimensions with orientation applied.
- `takenAt` is an ISO 8601 string or `null`.
- `canEdit` is `true` if the **requesting user** may edit or delete photos (`admin` and `partner`: `true`; `guest`: `false`). Use it to show or hide edit/delete buttons. It depends on the viewer, not the photo.
- `thumbUrl` / `fullUrl` are signed Cloudinary URLs. They are rebuilt on every response, but are deterministic (no expiry), so the same photo always yields the same URL and browser caching works.

---

## Roles

| Role | Meaning |
|---|---|
| `pending_approval` | Default for new sign-ups. Cannot log in or use any authenticated endpoint. |
| `guest` | **View only.** Can list photos. Cannot upload, edit or delete. |
| `partner` | Can view, upload, edit and delete **all photos**, including ones uploaded by other users. Cannot manage user accounts. |
| `admin` | Can do everything: all photo actions, plus managing user accounts via `/api/admin/*`. There is only one admin. Created only with `npm run create-admin`, never through the API. |

### Permission matrix

| Action | Endpoint | `guest` | `partner` | `admin` |
|---|---|:---:|:---:|:---:|
| View photos | `GET /api/photos` | ✅ | ✅ | ✅ |
| Upload (sign + save) | `POST /api/uploads/sign`, `POST /api/photos` | ❌ | ✅ | ✅ |
| Storage status | `GET /api/uploads/storage` | ❌ | ✅ | ✅ |
| Edit any photo | `PATCH /api/photos/:id` | ❌ | ✅ | ✅ |
| Delete any photo | `DELETE /api/photos/:id` | ❌ | ✅ | ✅ |
| List, approve, reject and delete accounts | `/api/admin/*` | ❌ | ❌ | ✅ |
| Read own account | `GET /api/auth/me` | ✅ | ✅ | ✅ |

User data is protected separately from photos: only admins can list, approve, reject or delete other users' accounts. There is currently no endpoint for editing your own account (nickname, password), so the only user-data action a non-admin has is reading their own via `/api/auth/me`.

Roles are re-checked from the database on every request, so a role change takes effect immediately.

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

`429` — rate limited: 5 signups per IP per hour.

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

`429` — rate limited: after 10 failed attempts from one IP within 15 minutes, further attempts are refused until the window resets. Successful logins don't count towards the limit.

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

### `GET /api/admin/users`

Lists every account except the admin's, oldest first. All other roles are included (`partner`, `guest` and `pending_approval`). There is only one admin and it isn't managed through the API, so it never appears here. The list is not paginated. Password hashes are never included.

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
      "role": "partner",
      "createdAt": "2026-10-01T10:00:00.000Z"
    },
    {
      "id": "665f...",
      "username": "carol",
      "nickname": "Carol",
      "role": "pending_approval",
      "createdAt": "2026-10-29T08:12:44.120Z"
    }
  ]
}
```

---

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

Deletes a pending account, which frees the username for reuse. Only pending accounts can be rejected; to remove an account that has already been approved, use [`DELETE /api/admin/users/:id`](#delete-apiadminusersid).

**URL params:** `id` — 24-character hex ObjectId · **Body:** none

**Responses**

`204 No Content`

`404 Not Found`

```json
{ "error": "Pending user not found" }
```

`400` — invalid `id`.

---

### `DELETE /api/admin/users/:id`

Permanently deletes a `partner`, `guest` or `pending_approval` account, which frees the username for reuse. The user's session stops working immediately: their next request returns `401`. **This can't be undone.**

The admin account can't be deleted through the API. Trying to delete your own account returns `403`, and an admin id is never matched by this endpoint.

**URL params**

| Param | Rules |
|---|---|
| `id` | MongoDB ObjectId (24 hex characters). |

**Body:** none

**Responses**

`204 No Content`

`403 Forbidden` — `id` is the requesting admin's own account

```json
{ "error": "You cannot delete your own account", "code": "cannot_delete_self" }
```

`404 Not Found` — no deletable user with that id

```json
{ "error": "User not found" }
```

`400` — invalid `id`.

---

## Photos

Base path: `/api/photos`

**Auth:** every route here requires a logged-in, approved user. Viewing is open to every role; creating, editing and deleting need `partner` or `admin`, and then apply to **any** photo, whoever uploaded it (see the [permission matrix](#permission-matrix)).

### `GET /api/photos`

**Roles:** `guest`, `partner`, `admin`

Returns one page of photos, newest first, using cursor pagination. Photos from all users are included. Each photo carries a `canEdit` flag (`false` for guests).

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

**Roles:** `partner`, `admin` (guests get `403`).

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

`403` — guest · `400` — validation failed · `429` — rate limited.

---

### `PATCH /api/photos/:id`

**Roles:** `partner`, `admin` (any photo, whoever uploaded it). Guests get `403`.

Edits a photo's metadata. Only `kind` and `takenAt` can change; dimensions, thumbhash and sizes describe the stored files and are not editable.

**URL params**

| Param | Rules |
|---|---|
| `id` | The photo's `id` (lowercase UUID), as returned in the Photo object. |

**Body** — send at least one field.

| Field | Type | Rules |
|---|---|---|
| `kind` | string, optional | `photo`, `graphic` or `sticker`. |
| `takenAt` | string / `null`, optional | ISO 8601 datetime with offset to set it, `null` to clear it. Leave the key out to keep the current value. |

```json
{ "kind": "graphic", "takenAt": "2026-08-14T17:30:00+08:00" }
```

**Responses**

`200 OK`

```json
{ "photo": { /* updated Photo object */ } }
```

`403 Forbidden` — guest

```json
{ "error": "You do not have permission to do this", "code": "forbidden" }
```

`404 Not Found` — no photo with that id

```json
{ "error": "Photo not found", "code": "not_found" }
```

`400` — invalid `id`, invalid field, or an empty body (`"Provide at least one field to change: kind or takenAt"`).

---

### `DELETE /api/photos/:id`

**Roles:** `partner`, `admin` (any photo, whoever uploaded it). Guests get `403`.

Permanently deletes the photo: the database record first, then both Cloudinary assets (`full` and `thumb`), and the freed space is reflected in the storage figures. **This can't be undone.**

If the record is deleted but Cloudinary cleanup fails, the request still succeeds (the photo is gone from the app); the orphaned asset ids are logged on the server for manual cleanup.

**Rate limit:** 200 requests per 15 minutes per user (separate counter).

**URL params:** `id` — the photo's `id` (lowercase UUID) · **Body:** none

**Responses**

`204 No Content`

`403 Forbidden` — guest

```json
{ "error": "You do not have permission to do this", "code": "forbidden" }
```

`404 Not Found`

```json
{ "error": "Photo not found", "code": "not_found" }
```

`400` — invalid `id` · `429` — rate limited.

---

## Uploads

Base path: `/api/uploads`

**Auth:** every route here requires a logged-in `partner` or `admin`. Guests are view-only and get `403`.

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

`403` — guest · `429` — rate limited.

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
| `POST` | `/api/auth/signup` | none | `201` | Create a pending account (5/hour/IP) |
| `POST` | `/api/auth/login` | none | `200` | Log in, set session cookie (10 failures/15 min/IP) |
| `POST` | `/api/auth/logout` | none | `204` | Log out, clear cookie |
| `GET` | `/api/auth/me` | any user | `200` | Current user |
| `GET` | `/api/admin/users` | admin | `200` | List all accounts except the admin's |
| `GET` | `/api/admin/users/pending` | admin | `200` | List pending accounts |
| `POST` | `/api/admin/users/:id/approve` | admin | `200` | Approve as `partner` / `guest` |
| `POST` | `/api/admin/users/:id/reject` | admin | `204` | Delete a pending account |
| `DELETE` | `/api/admin/users/:id` | admin | `204` | Delete a non-admin account |
| `GET` | `/api/photos` | guest, partner, admin | `200` | Paginated photo list |
| `POST` | `/api/photos` | partner, admin | `201` | Save metadata after uploads finish |
| `PATCH` | `/api/photos/:id` | partner, admin | `200` | Edit `kind` / `takenAt` on any photo |
| `DELETE` | `/api/photos/:id` | partner, admin | `204` | Delete any photo and its Cloudinary assets |
| `POST` | `/api/uploads/sign` | partner, admin | `200` | Get Cloudinary upload signatures |
| `GET` | `/api/uploads/storage` | partner, admin | `200` | Storage usage status |