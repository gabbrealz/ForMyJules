export type PageDef = { kind: "cover" } | { kind: "back" } | { kind: "blank" }

// With the cover on, the page count must be even: cover + inner pages + back cover.
// Page 0 is the cover, odd indexes are left-hand pages, even indexes are right-hand pages.
const INNER_PAGE_COUNT = 6

export const PAGES: PageDef[] = [
  { kind: "cover" },
  ...Array.from({ length: INNER_PAGE_COUNT }, (): PageDef => ({ kind: "blank" })),
  { kind: "back" },
]

// Mock until the scrapbook is saved to the server. Noon UTC, so it reads as
// the same calendar day in every timezone from UTC-12 to UTC+11.
export const MOCK_LAST_UPDATED = new Date("2026-10-28T12:00:00Z")
