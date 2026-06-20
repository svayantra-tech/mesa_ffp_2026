import { listProgramMedia, listBrands } from '@/lib/admin-data'
import { connectDB } from '@/lib/mongodb'
import { ProgramMedia } from '@/lib/models/ProgramMedia'
import LandingForm from '../../_components/LandingForm'

export const dynamic = 'force-dynamic'

const TOP_PERFORMER_SLUGS = ['azuri', 'kintoken', 'tact', 'lysso']

export default async function LandingPage() {
  const [media, allBrands] = await Promise.all([
    listProgramMedia(),
    listBrands(),
  ])

  // One-time migration: write legacy flea_photo_1..6 into the new unlimited JSON key
  // if it doesn't exist yet. Runs on every admin load but is a no-op once migrated.
  const mediaMap = Object.fromEntries(media.map((m) => [m.key, m.value]))
  if (!mediaMap['landing_flea_photos']) {
    const legacyPhotos = [1, 2, 3, 4, 5, 6]
      .map((n) => mediaMap[`flea_photo_${n}`])
      .filter(Boolean) as string[]
    if (legacyPhotos.length > 0) {
      await connectDB()
      await ProgramMedia.updateOne(
        { key: 'landing_flea_photos' },
        { $set: { value: JSON.stringify(legacyPhotos) } },
        { upsert: true }
      )
      // patch the in-memory media array so LandingForm loads the migrated value immediately
      media.push({ key: 'landing_flea_photos', value: JSON.stringify(legacyPhotos) })
    }
  }

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
