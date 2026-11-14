# Photos

[← Back to API Reference](README.md)

Base path: `/api/photos`

**Auth:** every route here requires a logged-in, approved user. Viewing is open to every role; creating, editing and deleting need `partner` or `admin`, and then apply to **any** photo, whoever uploaded it (see the [permission matrix](roles.md#permission-matrix)).

Uploading is a two-step flow (sign, then save); see [Typical upload flow](uploads.md#typical-upload-flow).

---

## Photo object

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

## `GET /api/photos`

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
  "photos": [ /* Photo objects, see "Photo object" above */ ],
  "nextCursor": "665f1c2e8a1b2c3d4e5f6a7b"
}
```

`nextCursor` is `null` on the last page. Pass it unchanged as `cursor` to fetch the next page.

`400` — invalid `cursor`, `limit` or `kind`.

---

## `POST /api/photos`

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

## `PATCH /api/photos/:id`

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

## `DELETE /api/photos/:id`

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
