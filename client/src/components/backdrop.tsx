import type { CSSProperties, ReactNode } from "react"
import { cn } from "cn"

// How long each photo takes to travel across the screen. Higher = slower.
const SECONDS_PER_SLIDE = 30

// Must match the breakpoint in hooks/use-mobile.ts (768px).
const MOBILE_MEDIA = "(max-width: 767px)"

type UrlGlob = Record<string, string>

// Vite hands back { "../assets/mobile/pic-1.jpg": "/assets/pic-1.hash.jpg", ... }.
// Sort numerically so pic-2 comes before pic-10.
const sortedUrls = (modules: UrlGlob) =>
  Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, url]) => url)

const wideUrls = sortedUrls(
  import.meta.glob<string>("../assets/wide-screen/*.{jpg,jpeg,png,webp}", {
    eager: true,
    query: "?url",
    import: "default",
  }),
)
const mobileUrls = sortedUrls(
  import.meta.glob<string>("../assets/mobile/*.{jpg,jpeg,png,webp}", {
    eager: true,
    query: "?url",
    import: "default",
  }),
)

// Pair wide + mobile versions of each photo by position (pic-1 with pic-1, ...).
const slides = wideUrls.map((wide, i) => ({ wide, mobile: mobileUrls[i] ?? wide }))

// The set is rendered twice back-to-back. The track slides left by exactly one
// set's width (-50%) and then restarts, which looks identical to where it began,
// so the loop is seamless and the speed never changes. (Each photo carries its
// own right margin so both halves are exactly the same width.)
const track = [...slides, ...slides]

const css = `
@keyframes backdrop-slide {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
.backdrop-track {
  animation: backdrop-slide var(--backdrop-duration) linear infinite;
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .backdrop-track { animation: none; }
}
`

export function Backdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-brown">
      <style>{css}</style>

      {slides.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 overflow-hidden py-[12svh] pl-4 md:py-[14svh] md:pl-6"
        >
          <div
            className="backdrop-track flex h-full w-max"
            style={
              {
                "--backdrop-duration": `${slides.length * SECONDS_PER_SLIDE}s`,
              } as CSSProperties
            }
          >
            {track.map((slide, i) => (
              // Height comes from the padded container; width follows from the
              // photo's aspect ratio (3:4 on mobile, 4:3 on wide screens).
              // The right margin is the gap between photos.
              <picture
                key={i}
                className={cn(
                  "mr-4 block aspect-3/4 h-full shrink-0 md:mr-6 md:aspect-4/3",
                  "mask-[linear-gradient(to_bottom,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
              )}>
                <source media={MOBILE_MEDIA} srcSet={slide.mobile} />
                <img
                  src={slide.wide}
                  alt=""
                  draggable={false}
                  decoding="async"
                  className="size-full rounded-md object-cover shadow-2xl select-none"
                />
              </picture>
            ))}
          </div>
        </div>
      )}

      <div className="absolute inset-0 -z-10 bg-linear-to-t from-black via-black/60 to-black/40" />
      {children}
    </div>
  )
}
