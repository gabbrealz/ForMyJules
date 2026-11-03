/** True when the user has asked the system to reduce motion. */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
