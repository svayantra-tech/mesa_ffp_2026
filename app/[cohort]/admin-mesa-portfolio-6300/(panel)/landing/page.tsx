import { notFound } from 'next/navigation'
import { isValidCohort } from '@/lib/cohorts'
import { listProgramMedia, listBrands, upsertProgramMedia } from '@/lib/db/queries'
import LandingForm from '../../_components/LandingForm'

export const dynamic = 'force-dynamic'

const TOP_PERFORMER_SLUGS = ['azuri', 'kintoken', 'tact', 'lysso']

type Params = { cohort: string }

export default async function LandingPage({ params }: { params: Promise<Params> }) {
  const { cohort } = await params
  if (!isValidCohort(cohort)) notFound()

  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const [media, allBrands] = await Promise.all([
    listProgramMedia(cohort),
    listBrands(cohort),
  ])

  // One-time migration: promote legacy flea_photo_1..6 into the new JSON key (cohort-scoped)
  const mediaMap = Object.fromEntries(media.map((m) => [m.key, m.value]))
  if (!mediaMap['landing_flea_photos']) {
    const legacyPhotos = [1, 2, 3, 4, 5, 6]
      .map((n) => mediaMap[`flea_photo_${n}`])
      .filter(Boolean) as string[]
    if (legacyPhotos.length > 0) {
      await upsertProgramMedia(cohort, [{ key: 'landing_flea_photos', value: JSON.stringify(legacyPhotos) }])
      media.push({ key: 'landing_flea_photos', value: JSON.stringify(legacyPhotos) })
    }
  }

  const topBrands = TOP_PERFORMER_SLUGS
    .map((s) => allBrands.find((b) => b.slug === s))
    .filter(Boolean) as NonNullable<ReturnType<typeof allBrands.find>>[]

  const topIds = new Set(topBrands.map((b) => b.id))
  const awardOnlyBrands = allBrands
    .filter((b) => b.awards.length > 0 && !topIds.has(b.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const ventures = [...topBrands, ...awardOnlyBrands]

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Landing Page</h1>
          <p className="admin-sub">Homepage media, venture photos, and section content.</p>
        </div>
        <a href={`/${cohort}`} target="_blank" rel="noreferrer" className="admin-btn admin-btn-sm">View landing ↗</a>
      </div>

      <LandingForm cohort={cohort} media={media} ventures={ventures} />
    </>
  )
}
