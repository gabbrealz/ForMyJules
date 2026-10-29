import type { AdminUser } from "#features/admin"

// TODO: replace both lists with real requests to your backend.
export const USERS: AdminUser[] = [
  { id: "1", username: "mochi", nickname: "Mochi Bear", role: "Partner" },
  { id: "2", username: "biscuit", nickname: "Biscuit", role: "Partner" },
  { id: "3", username: "tofu.cat", nickname: "Tofu", role: "Guest" },
  { id: "4", username: "peaches", nickname: "Peachy", role: "Partner" },
  { id: "5", username: "nori", nickname: "Nori-chan", role: "Guest" },
  { id: "6", username: "whiskers_92", nickname: "Whiskers", role: "Guest" },
  { id: "7", username: "pumpkin", nickname: "Pumpkin Pie", role: "Partner" },
]

export const PENDING_REGISTRATIONS: AdminUser[] = [
  { id: "p1", username: "marshmallow", nickname: "Marshie", role: "Guest" },
  { id: "p2", username: "cocoa", nickname: "Coco", role: "Guest" },
  { id: "p3", username: "sprout.k", nickname: "Sprout", role: "Guest" },
  { id: "p4", username: "latte_lover", nickname: "Latte", role: "Guest" },
]
