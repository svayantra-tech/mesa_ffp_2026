export type Cohort = {
  slug: string
  name: string
  year: number
  durationLabel: string // program duration, e.g. "2 Weeks" — not derived data
}

// Single source of truth for valid cohorts.
// To add Cohort 3+: append an entry here — nothing else changes.
export const COHORTS: Cohort[] = [
  { slug: 'cohort-1', name: 'Cohort 1', year: 2026, durationLabel: '2 Weeks' },
  { slug: 'cohort-2', name: 'Cohort 2', year: 2026, durationLabel: '2 Weeks' },
]

export const LATEST_COHORT: string = COHORTS[COHORTS.length - 1].slug

export function isValidCohort(slug: string): boolean {
  return COHORTS.some((c) => c.slug === slug)
}

export function getCohort(slug: string): Cohort | undefined {
  return COHORTS.find((c) => c.slug === slug)
}
