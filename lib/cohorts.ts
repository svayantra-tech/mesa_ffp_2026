export type Cohort = {
  slug: string
  name: string
  year: number
}

// Single source of truth for valid cohorts.
// To add Cohort 3+: append an entry here — nothing else changes.
export const COHORTS: Cohort[] = [
  { slug: 'cohort-1', name: 'Cohort 1', year: 2026 },
  { slug: 'cohort-2', name: 'Cohort 2', year: 2026 },
]

export const LATEST_COHORT: string = COHORTS[COHORTS.length - 1].slug

export function isValidCohort(slug: string): boolean {
  return COHORTS.some((c) => c.slug === slug)
}

export function getCohort(slug: string): Cohort | undefined {
  return COHORTS.find((c) => c.slug === slug)
}
