export type TopPerformer = { slug: string; label: string }

// Demo Day chip stats — non-derived, per-cohort facts (how the pitch event ran).
// These are NOT computed from DB counts; they're what actually happened at that
// cohort's Demo Day, so each cohort carries its own values.
export type DemoDayStats = {
  ventures: number
  awards: number
  pitchLabel: string // e.g. "5 min"
  vcJudges: number
}

export type Cohort = {
  slug: string
  name: string
  year: number
  durationLabel: string // program duration, e.g. "2 Weeks" — not derived data
  // Curated "Top Performers" (award winners) for this cohort, in display order.
  // Per-cohort so it never leaks across cohorts. Absent → the landing auto-derives
  // the list from this cohort's brands that have a feature_photo (revenue desc).
  topPerformers?: TopPerformer[]
  demoDay: DemoDayStats
}

// Single source of truth for valid cohorts.
// To add Cohort 3+: append an entry here — nothing else changes.
export const COHORTS: Cohort[] = [
  {
    slug: 'cohort-1',
    name: 'Cohort 1',
    year: 2026,
    durationLabel: '2 Weeks',
    topPerformers: [
      { slug: 'azuri', label: 'Highest Revenue' },
      { slug: 'kintoken', label: '2nd Highest Revenue' },
      { slug: 'tact', label: 'Best Pitch' },
      { slug: 'lysso', label: 'Spirit Award' },
    ],
    demoDay: { ventures: 29, awards: 8, pitchLabel: '5 min', vcJudges: 3 },
  },
  {
    slug: 'cohort-2',
    name: 'Cohort 2',
    year: 2026,
    durationLabel: '2 Weeks',
    demoDay: { ventures: 30, awards: 8, pitchLabel: '5 min', vcJudges: 4 },
  },
]

export const LATEST_COHORT: string = COHORTS[COHORTS.length - 1].slug

export function isValidCohort(slug: string): boolean {
  return COHORTS.some((c) => c.slug === slug)
}

export function getCohort(slug: string): Cohort | undefined {
  return COHORTS.find((c) => c.slug === slug)
}
