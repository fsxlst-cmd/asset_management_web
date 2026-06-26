/**
 * Clock port — use-cases never read the wall clock directly, so they stay
 * deterministic under test (a fake clock returns a fixed instant).
 */
export interface Clock {
  now(): Date
}
