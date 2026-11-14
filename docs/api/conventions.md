# Conventions

[← Back to API Reference](README.md)

## Authentication

Logging in sets an `httpOnly` cookie named `sid` (7-day lifetime, stored server-side in MongoDB). Send it with every request:

- Browser `fetch`: use `credentials: 'include'`.
- In production the cookie is `Secure` (HTTPS only). `SameSite` defaults to `lax`; set `COOKIE_SAMESITE=none` if the frontend is on a different site than the API.

The user is re-loaded from the database on every authenticated request, so deleting an account or moving it back to `pending_approval` takes effect immediately (the session is destroyed and the next call returns `401`).

## Request bodies

Send `Content-Type: application/json`. Unknown keys in a body are silently stripped. Strings described as "trimmed" or "lowercased" are normalized before use.

## Common error responses

| Status | Body | When |
|---|---|---|
| `400` | `{ "error": "Validation failed", "details": [{ "field": "username", "message": "..." }] }` | Body, params or query failed validation. `field` is a dotted path. |
| `400` | `{ "error": "Bad request" }` | Malformed JSON body or other client error raised by Express. |
| `401` | `{ "error": "Authentication required" }` | No session, or the session's user no longer exists / is pending. |
| `403` | `{ "error": "Admin access required" }` | Authenticated but not an admin (`/api/admin/*` only). |
| `403` | `{ "error": "You do not have permission to do this", "code": "forbidden" }` | Authenticated but the role isn't allowed to do this, e.g. a guest trying to upload, edit or delete a photo, or editing someone else's account without being an admin. |
| `429` | `{ "error": "Too many requests. Please slow down.", "code": "rate_limited" }` | A rate limit was hit (per user on photo/upload routes, per IP on login and signup). Standard `RateLimit*` headers (draft-7) are included. |
| `500` | `{ "error": "Internal server error" }` | Unexpected server error. |

Only endpoint-specific errors are listed on each feature's page; the common ones above can occur on any endpoint that mentions the corresponding middleware.

## Shared object shapes

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
