/**
 * Pre-launch DB audit.
 * Run:   npx tsx --env-file=.env.local scripts/audit.ts
 * Fix:   npx tsx --env-file=.env.local scripts/audit.ts --fix
 */

import mongoose from 'mongoose'
import { Student } from '../lib/models/Student'
import { Brand } from '../lib/models/Brand'

const FIX = process.argv.includes('--fix')

async function connectDB() {
  if (process.env.MONGODB_DNS) {
    const dns = await import('dns')
    dns.setServers([process.env.MONGODB_DNS])
    dns.setDefaultResultOrder('ipv4first')
  }
  await mongoose.connect(process.env.MONGODB_URI!)
}

const EVENT_PHOTO_FIELDS = ['convocation_photo', 'flea_market_photo', 'demo_day_photo'] as const
type PhotoField = (typeof EVENT_PHOTO_FIELDS)[number]

async function main() {
  console.log('\n🔍  Connecting to MongoDB…')
  await connectDB()
  console.log('✅  Connected.\n')

  // ── Counts ─────────────────────────────────────────────────────────────────
  const [studentCount, brandCount] = await Promise.all([
    Student.countDocuments(),
    Brand.countDocuments(),
  ])
  const studentFlag = studentCount !== 113 ? ' ⚠️  EXPECTED 113' : ''
  const brandFlag   = brandCount   !== 29  ? ' ⚠️  EXPECTED 29'  : ''
  console.log(`📊  Students: ${studentCount}${studentFlag}`)
  console.log(`📊  Brands:   ${brandCount}${brandFlag}\n`)

  // ── Missing certificate_url ─────────────────────────────────────────────────
  const missingCert = await Student.find(
    { $or: [{ certificate_url: '' }, { certificate_url: null }, { certificate_url: { $exists: false } }] },
    { name: 1, slug: 1 }
  ).lean()
  console.log(`🎓  Students missing certificate_url: ${missingCert.length}`)
  for (const s of missingCert) console.log(`     • ${s.name} (${s.slug})`)
  if (missingCert.length) console.log()

  // ── Junk event-photo values (non-http) ────────────────────────────────────
  const allStudents = await Student.find({}, {
    name: 1, slug: 1,
    convocation_photo: 1, flea_market_photo: 1, demo_day_photo: 1,
  }).lean()

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
    console.log('🔧  --fix: clearing junk values…')
    for (const j of junk) {
      await Student.updateOne({ slug: j.slug }, { $set: { [j.field]: '' } })
      console.log(`     cleared ${j.student} / ${j.field}`)
    }
    console.log()
  }

  // ── Students with ALL 3 event photos missing ──────────────────────────────
  const noMoments = allStudents.filter((s) =>
    !((s.convocation_photo as string)?.startsWith('http')) &&
    !((s.flea_market_photo as string)?.startsWith('http')) &&
    !((s.demo_day_photo as string)?.startsWith('http'))
  )
  console.log(`📷  Students with no event photos (Moments section hidden): ${noMoments.length}`)
  for (const s of noMoments) console.log(`     • ${s.name} (${s.slug})`)
  if (noMoments.length) console.log()

  // ── Students missing profile_photo ─────────────────────────────────────────
  const noProfile = await Student.countDocuments({
    $or: [{ profile_photo: '' }, { profile_photo: null }, { profile_photo: { $exists: false } }],
  })
  console.log(`🖼️   Students missing profile_photo (no-photo hero layout): ${noProfile}\n`)

  // ── Brands with no videos AND no ad_statics ────────────────────────────────
  const brands = await Brand.find({}, { name: 1, videos: 1, ad_statics: 1 }).lean()
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
