import { connectDB } from '@/lib/mongodb'
import { ProgramMedia } from '@/lib/models/ProgramMedia'
import { COHORTS, type Cohort } from '@/lib/cohorts'

function enabledKey(slug: string) {
  return `cohort_enabled_${slug}`
}

export async function getCohortEnabled(slug: string): Promise<boolean> {
  await connectDB()
  const doc = await ProgramMedia.findOne({ cohort: slug, key: enabledKey(slug) }).lean()
  if (!doc) return true // default: enabled (safe for cohort-1 which is already live)
  return (doc as { value: string }).value !== 'false'
}

export async function setCohortEnabled(slug: string, enabled: boolean): Promise<void> {
  await connectDB()
  await ProgramMedia.updateOne(
    { cohort: slug, key: enabledKey(slug) },
    { $set: { value: enabled ? 'true' : 'false' } },
    { upsert: true }
  )
}

export async function getEnabledCohorts(): Promise<Cohort[]> {
  const results = await Promise.all(
    COHORTS.map(async (c) => ({ cohort: c, enabled: await getCohortEnabled(c.slug) }))
  )
  return results.filter((r) => r.enabled).map((r) => r.cohort)
}
