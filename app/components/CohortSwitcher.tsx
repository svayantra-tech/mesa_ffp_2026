'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type CohortEntry = { slug: string; name: string }

type Props = {
  cohorts: CohortEntry[]
  currentCohort: string
  pageType: 'landing' | 'directory' | 'slug'
  slug?: string
}

function targetUrl(cohortSlug: string, pageType: Props['pageType'], slug?: string): string {
  if (pageType === 'directory') return `/${cohortSlug}/directory`
  if (pageType === 'slug') return `/${cohortSlug}` // overridden by API check on click
  return `/${cohortSlug}`
}

export default function CohortSwitcher({ cohorts, currentCohort, pageType, slug }: Props) {
  const router = useRouter()
  const [loadingCohort, setLoadingCohort] = useState<string | null>(null)

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>, targetCohort: string) {
    if (targetCohort === currentCohort) { e.preventDefault(); return }

    // For landing/directory, let the <a href> navigate normally.
    if (pageType !== 'slug') return

    // For portfolio slug pages: check if the slug exists in the target cohort first.
    e.preventDefault()
    setLoadingCohort(targetCohort)
    try {
      const res = await fetch(
        `/api/cohort-switch?to=${encodeURIComponent(targetCohort)}&slug=${encodeURIComponent(slug ?? '')}`
      )
      const data = await res.json()
      router.push(data.url ?? `/${targetCohort}`)
    } catch {
      router.push(`/${targetCohort}`)
    } finally {
      setLoadingCohort(null)
    }
  }

  return (
    <div className="cohort-switcher" role="group" aria-label="Switch cohort">
      {cohorts.map((c) => {
        const isActive = c.slug === currentCohort
        const isLoading = loadingCohort === c.slug
        return (
          <a
            key={c.slug}
            href={targetUrl(c.slug, pageType, slug)}
            className={`cs-pill${isActive ? ' active' : ''}`}
            onClick={(e) => handleClick(e, c.slug)}
            aria-current={isActive ? 'page' : undefined}
            aria-disabled={isActive || undefined}
          >
            {isLoading ? '…' : c.name}
          </a>
        )
      })}
    </div>
  )
}
