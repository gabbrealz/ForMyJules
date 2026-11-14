# API Reference

All endpoints live under `/api` and speak JSON. Authentication uses a session cookie, not tokens.

## Contents

- [Conventions](conventions.md) — authentication, request bodies, common errors, shared object shapes
- [Roles and permissions](roles.md) — what each role can do
- [Auth](auth.md) — `/api/auth`
- [Admin](admin.md) — `/api/admin`
- [Users](users.md) — `/api/users`
- [Photos](photos.md) — `/api/photos`
- [Uploads](uploads.md) — `/api/uploads`, including the typical upload flow

## Endpoint summary

| Method | Path | Auth | Success | Description | Details |
|---|---|---|---|---|---|
| `POST` | `/api/auth/signup` | none | `201` | Create a pending account (5/hour/IP) | [docs](auth.md#post-apiauthsignup) |
| `POST` | `/api/auth/login` | none | `200` | Log in, set session cookie (10 failures/15 min/IP) | [docs](auth.md#post-apiauthlogin) |
| `POST` | `/api/auth/logout` | none | `204` | Log out, clear cookie | [docs](auth.md#post-apiauthlogout) |
| `GET` | `/api/auth/me` | any user | `200` | Current user | [docs](auth.md#get-apiauthme) |
| `GET` | `/api/admin/users` | admin | `200` | List all accounts except the admin's | [docs](admin.md#get-apiadminusers) |
| `GET` | `/api/admin/users/pending` | admin | `200` | List pending accounts | [docs](admin.md#get-apiadminuserspending) |
| `GET` | `/api/admin/users/pending/count` | admin | `200` | Get number of pending accounts | [docs](admin.md#get-apiadminuserspendingcount) |
| `POST` | `/api/admin/users/:id/approve` | admin | `200` | Approve as `partner` / `guest` | [docs](admin.md#post-apiadminusersidapprove) |
| `POST` | `/api/admin/users/:id/reject` | admin | `204` | Delete a pending account | [docs](admin.md#post-apiadminusersidreject) |
| `DELETE` | `/api/admin/users/:id` | admin | `204` | Delete a non-admin account | [docs](admin.md#delete-apiadminusersid) |
| `PATCH` | `/api/users/:id` | self or admin | `200` | Edit `nickname` / `password` (own account, or any account as admin); `role` is admin only | [docs](users.md#patch-apiusersid) |
| `GET` | `/api/photos` | guest, partner, admin | `200` | Paginated photo list | [docs](photos.md#get-apiphotos) |
| `POST` | `/api/photos` | partner, admin | `201` | Save metadata after uploads finish | [docs](photos.md#post-apiphotos) |
| `PATCH` | `/api/photos/:id` | partner, admin | `200` | Edit `kind` / `takenAt` on any photo | [docs](photos.md#patch-apiphotosid) |
| `DELETE` | `/api/photos/:id` | partner, admin | `204` | Delete any photo and its Cloudinary assets | [docs](photos.md#delete-apiphotosid) |
| `POST` | `/api/uploads/sign` | partner, admin | `200` | Get Cloudinary upload signatures | [docs](uploads.md#post-apiuploadssign) |
| `GET` | `/api/uploads/storage` | partner, admin | `200` | Storage usage status | [docs](uploads.md#get-apiuploadsstorage) |
