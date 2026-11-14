# Roles

[← Back to API Reference](README.md)

| Role | Meaning |
|---|---|
| `pending_approval` | Default for new sign-ups. Cannot log in or use any authenticated endpoint. |
| `guest` | **View only.** Can list photos. Cannot upload, edit or delete. |
| `partner` | Can view, upload, edit and delete **all photos**, including ones uploaded by other users. Cannot manage user accounts. |
| `admin` | Can do everything: all photo actions, plus managing user accounts via `/api/admin/*` and editing any account, including roles, via `PATCH /api/users/:id`. There is only one admin. Created only with `npm run create-admin`, never through the API. |

## Permission matrix

| Action | Endpoint | `guest` | `partner` | `admin` |
|---|---|:---:|:---:|:---:|
| View photos | `GET /api/photos` | ✅ | ✅ | ✅ |
| Upload (sign + save) | `POST /api/uploads/sign`, `POST /api/photos` | ❌ | ✅ | ✅ |
| Storage status | `GET /api/uploads/storage` | ❌ | ✅ | ✅ |
| Edit any photo | `PATCH /api/photos/:id` | ❌ | ✅ | ✅ |
| Delete any photo | `DELETE /api/photos/:id` | ❌ | ✅ | ✅ |
| List, approve, reject and delete accounts | `/api/admin/*` | ❌ | ❌ | ✅ |
| Edit own account | `PATCH /api/users/:id` (own id) | ✅ | ✅ | ✅ |
| Edit another user's account | `PATCH /api/users/:id` (other id) | ❌ | ❌ | ✅ |
| Change a user's role | `PATCH /api/users/:id` with `role` | ❌ | ❌ | ✅ |
| Read own account | `GET /api/auth/me` | ✅ | ✅ | ✅ |

User data is protected separately from photos: only admins can list, approve, reject or delete other users' accounts, and only an admin or the account owner can edit an account (`PATCH /api/users/:id`). Guests and partners can edit their own nickname and password but nobody else's, and only the admin can change roles. Partner and guest roles don't grant any access to other users' data.

Roles are re-checked from the database on every request, so a role change takes effect immediately.
