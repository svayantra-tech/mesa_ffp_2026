/**
 * Student-field audit + (guarded) cleanup. Read-only by default.
 *
 * Renamed from audit.ts: the `--fix` path CLEARS student fields, so the name now
 * warns about that. Rails added — a bare run never writes:
 *
 *   Read-only audit (default):  npx tsx --env-file=.env.local scripts/clear-student-fields.ts COHORT=cohort-1
 *   Preview the clears (dry):    ... scripts/clear-student-fields.ts COHORT=cohort-1 --fix
 *   Actually clear (guarded):    DRY_RUN=false ... --fix --i-mean-prod   (prod requires --i-mean-prod)
 *
 * Requires an explicit cohort — no unscoped writes ever. --fix only clears
 * non-http junk values in convocation/flea/demo photo fields for that cohort.
 */

import mongoose from 'mongoose'
import { Student } from '../lib/models/Student'
import { Brand } from '../lib/models/Brand'
import { resolvedDbName, isDryRun } from './_guard'

const FIX = process.argv.includes('--fix')
const DRY_RUN = isDryRun() // default TRUE

// ── Rail: explicit cohort required — abort if missing (no unscoped reads/writes) ──
const COHORT = (process.env.COHORT || process.argv.find((a) => a.startsWith('--cohort='))?.split('=')[1] || '').trim()
if (!/^cohort-\d+$/.test(COHORT)) {
  console.error('ABORT: set an explicit cohort, e.g. COHORT=cohort-1 (or --cohort=cohort-1). No unscoped writes.')
  process.exit(1)
}

async function connectDB() {
  if (process.env.MONGODB_DNS) {
    const dns = await import('dns')
    dns.setServers(process.env.MONGODB_DNS.split(',').map((s) => s.trim()))
    dns.setDefaultResultOrder('ipv4first')
  }
  await mongoose.connect(process.env.MONGODB_URI!)
}

const EVENT_PHOTO_FIELDS = ['convocation_photo', 'flea_market_photo', 'demo_day_photo'] as const
type PhotoField = (typeof EVENT_PHOTO_FIELDS)[number]

async function main() {
  console.log(`\n🔍  Connecting to MongoDB… (cohort=${COHORT}, db=${resolvedDbName()}, DRY_RUN=${DRY_RUN})`)
  await connectDB()
  console.log('✅  Connected.\n')

  const [studentCount, brandCount] = await Promise.all([
    Student.countDocuments({ cohort: COHORT }),
    Brand.countDocuments({ cohort: COHORT }),
  ])
  console.log(`📊  Students (${COHORT}): ${studentCount}`)
  console.log(`📊  Brands   (${COHORT}): ${brandCount}\n`)

  const missingCert = await Student.find(
    { cohort: COHORT, $or: [{ certificate_url: '' }, { certificate_url: null }, { certificate_url: { $exists: false } }] },
    { name: 1, slug: 1 }
  ).lean()
  console.log(`🎓  Students missing certificate_url: ${missingCert.length}`)
  for (const s of missingCert) console.log(`     • ${s.name} (${s.slug})`)
  if (missingCert.length) console.log()

  const allStudents = await Student.find(
    { cohort: COHORT },
    { name: 1, slug: 1, convocation_photo: 1, flea_market_photo: 1, demo_day_photo: 1 }
  ).lean()

  type JunkEntry = { student: string; slug: string; field: PhotoField; value: string }
  const junk: JunkEntry[] = []
  for (const s of allStudents) {
    for (const field of EVENT_PHOTO_FIELDS) {
      const val: string = (s[field] as string) ?? ''
      if (val.length > 0 && !val.startsWith('http')) {
        junk.push({ student: s.name as string, slug: s.slug as string, field, value: val })
      }
    }
  }

  console.log(`🗑️   Junk event-photo values (non-http): ${junk.length}`)
  for (const j of junk) console.log(`     • ${j.student} / ${j.field} = "${j.value}"`)
  if (junk.length) console.log()

  if (FIX && junk.length > 0) {
    // ── Write rail: dry-run prints every intended write; prod needs --i-mean-prod ──
    if (DRY_RUN) {
      console.log('◆ DRY RUN — would clear these (set DRY_RUN=false to write):')
      for (const j of junk) console.log(`     ${j.slug} · ${j.field}: "${j.value}" → ""`)
      console.log()
    } else {
      if (resolvedDbName() === 'database' && !process.argv.includes('--i-mean-prod')) {
        console.error('ABORT: prod DB + DRY_RUN=false requires --i-mean-prod.')
        await mongoose.disconnect()
        process.exit(2)
      }
      console.log('🔧  --fix: clearing junk values (cohort-scoped)…')
      for (const j of junk) {
        await Student.updateOne({ slug: j.slug, cohort: COHORT }, { $set: { [j.field]: '' } })
        console.log(`     cleared ${j.student} / ${j.field}`)
      }
      console.log()
    }
  }

  const noMoments = allStudents.filter((s) =>
    !((s.convocation_photo as string)?.startsWith('http')) &&
    !((s.flea_market_photo as string)?.startsWith('http')) &&
    !((s.demo_day_photo as string)?.startsWith('http'))
  )
  console.log(`📷  Students with no event photos (Moments section hidden): ${noMoments.length}`)
  for (const s of noMoments) console.log(`     • ${s.name} (${s.slug})`)
  if (noMoments.length) console.log()

  const noProfile = await Student.countDocuments({
    cohort: COHORT,
    $or: [{ profile_photo: '' }, { profile_photo: null }, { profile_photo: { $exists: false } }],
  })
  console.log(`🖼️   Students missing profile_photo (no-photo hero layout): ${noProfile}\n`)

  const brands = await Brand.find({ cohort: COHORT }, { name: 1, videos: 1, ad_statics: 1 }).lean()
  const noMedia = brands.filter(
    (b) => (!b.videos || b.videos.length === 0) && (!b.ad_statics || b.ad_statics.length === 0)
  )
  console.log(`🎬  Brands with zero videos AND zero ad_statics (Video section hidden): ${noMedia.length}`)
  for (const b of noMedia) console.log(`     • ${b.name}`)
  if (noMedia.length) console.log()

  console.log('✅  Audit complete.\n')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Audit failed:', err)
  process.exit(1)
})
