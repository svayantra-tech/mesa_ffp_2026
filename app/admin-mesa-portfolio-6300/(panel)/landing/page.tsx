import { listProgramMedia, listBrands } from '@/lib/admin-data'
import LandingForm from '../../_components/LandingForm'

export const dynamic = 'force-dynamic'

const TOP_PERFORMER_SLUGS = ['azuri', 'kintoken', 'tact', 'lysso']

export default async function LandingPage() {
  const [media, allBrands] = await Promise.all([
    listProgramMedia(),
    listBrands(),
  ])

  // Top performer ventures first (in defined order), then any award-only ventures
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
        <a href="/" target="_blank" rel="noreferrer" className="admin-btn admin-btn-sm">View landing ↗</a>
      </div>

      <LandingForm media={media} ventures={ventures} />
    </>
  )
}
