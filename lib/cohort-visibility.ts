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

// ─── Preview access (view a disabled cohort via a semi-secret link) ──────────
//
// A random per-cohort token stored in program_media. Anyone with the token can
// view the cohort while it is still HIDDEN — for pre-launch review — without
// flipping the actual enabled state. Resetting the token invalidates old links.

function previewKey(slug: string) {
  return `preview_token_${slug}`
}

/** URL-safe random token (~192 bits) via Web Crypto — works in Node and Edge. */
function generateToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
}

/** Read the stored preview token, generating and persisting one on first use. */
export async function getPreviewToken(slug: string): Promise<string> {
  await connectDB()
  const key = previewKey(slug)
  const doc = await ProgramMedia.findOne({ cohort: slug, key }).lean()
  const existing = doc ? (doc as { value: string }).value : ''
  if (existing) return existing
  const token = generateToken()
  await ProgramMedia.updateOne({ cohort: slug, key }, { $set: { value: token } }, { upsert: true })
  return token
}

/** Generate a fresh token, invalidating any previously shared preview links. */
export async function resetPreviewToken(slug: string): Promise<string> {
  await connectDB()
  const token = generateToken()
  await ProgramMedia.updateOne(
    { cohort: slug, key: previewKey(slug) },
    { $set: { value: token } },
    { upsert: true }
  )
  return token
}

/** True only if `token` matches the cohort's stored preview token. Never auto-generates. */
export async function verifyPreviewToken(slug: string, token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  await connectDB()
  const doc = await ProgramMedia.findOne({ cohort: slug, key: previewKey(slug) }).lean()
  const stored = doc ? (doc as { value: string }).value : ''
  return stored.length > 0 && stored === token
}
