# Users

[← Back to API Reference](README.md)

Base path: `/api/users`

**Auth:** every route here requires a logged-in, approved user.

## `PATCH /api/users/:id`

**Roles:** any role may edit **their own** account; `admin` may edit **any** account. Everyone else gets `403`.

Edits an account's `nickname`, `password` and/or `role`. Everyone can change their own nickname and password, but **only the admin can change roles**. `username` can't be changed. A role change only applies to `partner` and `guest` accounts: pending accounts get their role by being approved via [`POST /api/admin/users/:id/approve`](admin.md#post-apiadminusersidapprove), and the admin's own role is fixed.

**Rate limit:** 20 requests per 15 minutes per user.

**URL params**

| Param | Rules |
|---|---|
| `id` | MongoDB ObjectId (24 hex characters). Use the `id` from `/api/auth/me` to edit yourself. |

**Body** — send at least one of `nickname`, `password` or `role`.

| Field | Type | Rules |
|---|---|---|
| `nickname` | string, optional | Same rules as signup: trimmed, 1–32 characters, no control characters. |
| `password` | string, optional | Same rules as signup: not trimmed, at least 8 characters and at most 72 bytes in UTF-8. |
| `currentPassword` | string, optional | **Required when changing your own password** (including an admin changing their own). Not needed when an admin changes someone else's password. Ignored otherwise. |
| `role` | string, optional | `"partner"` or `"guest"` (`admin` can't be assigned). **Admin only**: anyone else who sends it gets `403`, even when editing their own account. |

```json
{ "nickname": "Ally", "password": "a new long passphrase", "currentPassword": "a long passphrase" }
```

An admin changing another user's role:

```json
{ "role": "guest" }
```

**Responses**

`200 OK` — the updated user

```json
{ "user": { "id": "665f...", "username": "alice", "nickname": "Ally", "role": "partner" } }
```

`400` — validation failed (see [common errors](conventions.md#common-error-responses)), including an empty body (`"Provide at least one field to change: nickname, password or role"`) and a missing `currentPassword` when changing your own password.

`403 Forbidden` — not an admin and `id` isn't your own account (this is returned even if `id` doesn't exist)

```json
{ "error": "You do not have permission to do this", "code": "forbidden" }
```

`403 Forbidden` — `currentPassword` doesn't match

```json
{ "error": "Current password is incorrect", "code": "incorrect_current_password" }
```

`403 Forbidden` — a non-admin sent `role`

```json
{ "error": "Only an admin can change roles", "code": "forbidden" }
```

`403 Forbidden` — `role` sent for the admin's own account

```json
{ "error": "The admin's role can't be changed", "code": "cannot_change_admin_role" }
```

`409 Conflict` — `role` sent for a pending account (approve it instead)

```json
{ "error": "Pending accounts get their role when they are approved", "code": "pending_account" }
```

`404 Not Found` — admin only: no user with that id

```json
{ "error": "User not found" }
```

`429` — rate limited.

> Changing a password does **not** end the target's other sessions; they stay valid until they expire (7 days) or the account is deleted.
