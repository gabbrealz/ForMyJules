# Admin

[← Back to API Reference](README.md)

Base path: `/api/admin`

**Auth:** every route here requires a logged-in user with role `admin`. Non-admins receive `403 { "error": "Admin access required" }`; unauthenticated requests receive `401`.

## `GET /api/admin/users`

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

## `GET /api/admin/users/pending`

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

## `GET /api/admin/users/pending/count`

Gets the number of accounts waiting for approval.

**Body:** none

**Responses**

`200 OK`

```json
{
  "count": number
}
```

---

## `POST /api/admin/users/:id/approve`

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

## `POST /api/admin/users/:id/reject`

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

## `DELETE /api/admin/users/:id`

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
