# Auth

[← Back to API Reference](README.md)

Base path: `/api/auth`

## `POST /api/auth/signup`

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

`400` — validation failed (see [common errors](conventions.md#common-error-responses)).

`429` — rate limited: 5 signups per IP per hour.

---

## `POST /api/auth/login`

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

## `POST /api/auth/logout`

Destroys the session and clears the `sid` cookie. Safe to call when not logged in.

**Auth:** none · **Body:** none

**Responses**

`204 No Content`

---

## `GET /api/auth/me`

Returns the current user. Useful on page load to check whether the visitor is logged in.

**Auth:** required · **Body:** none

**Responses**

`200 OK`

```json
{ "user": { "id": "665f...", "username": "alice", "nickname": "Alice", "role": "partner" } }
```

`401 Unauthorized` — not logged in.
